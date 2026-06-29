import { createSupabaseServerClient } from '$lib/supabase';
import { type Handle, redirect } from '@sveltejs/kit';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(
		event.fetch,
		() => event.cookies.getAll(),
		(cookies) => {
			cookies.forEach(({ name, value, options }) => {
				event.cookies.set(name, value, { path: '/', ...options });
			});
		}
	);

	/**
	 * Safely gets the session without throwing on invalid JWTs.
	 * Always validate the session with getUser() on the server — never trust
	 * the client-passed session alone.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.user = user;

	// Domain Detection (Multi-tenant)
	const hostname = event.url.hostname;
	let tenant = null;

	if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('vercel.app') && !hostname.includes('pages.dev')) {
		const { data: schoolDomain } = await event.locals.supabase
			.from('schools')
			.select('id, name, logo_url, primary_color, status')
			.eq('custom_domain', hostname)
			.maybeSingle();
		
		if (schoolDomain) {
			tenant = schoolDomain;
		}
	}
	event.locals.tenant = tenant;

	// Load user profile (role, school) if authenticated
	if (user) {
		const { data: profile } = await event.locals.supabase
			.from('profiles')
			.select('id, full_name, role, school_id, phone, avatar_url, schools(logo_url, status, primary_color)')
			.eq('id', user.id)
			.single();
		
		if (profile) {
			event.locals.profile = {
				...profile,
				school_logo_url: profile.schools?.logo_url ?? null,
				school_status: profile.schools?.status ?? 'active',
				school_primary_color: profile.schools?.primary_color ?? null
			};
		} else {
			event.locals.profile = null;
		}
	} else {
		event.locals.profile = null;
	}

	// Cross-domain security check
	if (event.locals.user && tenant && event.locals.profile) {
		// Si el usuario tiene una escuela distinta al tenant del dominio, y no es admin global
		if (event.locals.profile.school_id !== tenant.id && event.locals.profile.role !== 'admin') {
			await event.locals.supabase.auth.signOut();
			throw redirect(303, '/login?error=invalid_domain');
		}
	}

	// Auth guard: redirect unauthenticated users to /login
	const isPublicRoute = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));
	if (!user && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// Suspended school guard
	if (
		user && 
		event.locals.profile?.school_status === 'suspended' && 
		event.locals.profile?.role !== 'admin' && 
		event.url.pathname !== '/suspendida' &&
		event.url.pathname !== '/logout'
	) {
		throw redirect(303, '/suspendida');
	}

	// Redirect authenticated users away from login
	if (user && event.url.pathname === '/login') {
		throw redirect(303, '/calendario');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Required for Supabase to pass the Content-Range header to the client
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
