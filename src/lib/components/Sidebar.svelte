<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		Menu, X, LogOut, Sun, Moon,
		Calendar, ListTodo, CalendarClock,
		UsersRound, Users, Settings,
		UserCog, ShieldCheck
	} from 'lucide-svelte';
	import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';
	import type { Snippet } from 'svelte';

	let { profile } = $props<{
		profile: {
			id: string;
			full_name: string | null;
			role: 'teacher' | 'director' | 'admin' | 'superadmin' | 'student' | 'tutor';
			school_id: string;
			phone: string | null;
			avatar_url: string | null;
			school_logo_url?: string | null;
		} | null;
	}>();

	const roleLabel: Record<string, string> = {
		teacher: 'Docente',
		director: 'Director/a',
		admin: 'Admin. Escuela',
		superadmin: 'Super Admin',
		student: 'Alumno/a',
		tutor: 'Tutor/a'
	};

	const roleClass: Record<string, string> = {
		teacher: 'role-teacher',
		director: 'role-director',
		admin: 'role-admin',
		superadmin: 'role-superadmin',
		student: 'role-student',
		tutor: 'role-tutor'
	};

	function getInitials(name: string | null) {
		if (!name) return '?';
		return name
			.split(' ')
			.slice(0, 2)
			.map((n) => n[0])
			.join('')
			.toUpperCase();
	}

	function avatarColor(role: string) {
		if (role === 'director') return 'linear-gradient(135deg, #7c3aed, #2563eb)';
		if (role === 'teacher') return 'linear-gradient(135deg, #0891b2, #0369a1)';
		if (role === 'admin') return 'linear-gradient(135deg, #f59e0b, #d97706)';
		if (role === 'superadmin') return 'linear-gradient(135deg, #ea580c, #c2410c)';
		if (role === 'student') return 'linear-gradient(135deg, #10b981, #059669)';
		return 'linear-gradient(135deg, #ec4899, #be185d)';
	}

	const allRoles = ['student', 'tutor', 'teacher', 'director', 'admin', 'superadmin'];

	const navGroups = [
		{
			label: 'Principal',
			items: [
				{ href: '/calendario', label: 'Calendario', icon: Calendar, roles: allRoles },
				{ href: '/tareas', label: 'Mis Tareas', icon: ListTodo, roles: allRoles },
				{ href: '/reuniones', label: 'Reuniones', icon: CalendarClock, roles: allRoles }
			]
		},
		{
			label: 'Gestión Escolar',
			items: [
				{ href: '/staff', label: 'Planificador Staff', icon: UsersRound, roles: ['director', 'admin', 'superadmin'] },
				{ href: '/alumnos', label: 'Alumnos y Tutores', icon: Users, roles: ['director', 'admin', 'superadmin'] },
				{ href: '/configuracion', label: 'Configuración', icon: Settings, roles: ['director', 'admin', 'superadmin'] }
			]
		},
		{
			label: 'Administración',
			items: [
				{ href: '/admin', label: 'Gestión Usuarios', icon: UserCog, roles: ['admin', 'superadmin'] },
				{ href: '/superadmin', label: 'Global Admin', icon: ShieldCheck, roles: ['superadmin'] }
			]
		}
	];

	const currentPath = $derived($page.url.pathname);
	const userRole = $derived(profile?.role ?? 'teacher');
	const visibleGroups = $derived(
		navGroups
			.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(userRole)) }))
			.filter((group) => group.items.length > 0)
	);

	let mobileOpen = $state(false);
	let theme = $state<Theme>('light');

	onMount(() => {
		theme = getInitialTheme();
	});

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		applyTheme(theme);
	}

	// Cerrar el drawer automáticamente al navegar
	$effect(() => {
		currentPath;
		mobileOpen = false;
	});

	// Bloquear el scroll de fondo mientras el drawer está abierto
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = mobileOpen ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') mobileOpen = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Mobile top bar -->
<div class="mobile-topbar">
	<button
		type="button"
		class="mobile-menu-btn"
		onclick={() => (mobileOpen = !mobileOpen)}
		aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
		aria-expanded={mobileOpen}
	>
		{#if mobileOpen}
			<X size="20" />
		{:else}
			<Menu size="20" />
		{/if}
	</button>
	<div class="mobile-brand">
		{#if profile && profile.school_logo_url}
			<img src={profile.school_logo_url} alt="Logo" class="mobile-brand-logo" />
		{:else}
			<svg width="22" height="22" viewBox="0 0 32 32" fill="none">
				<rect width="32" height="32" rx="9" fill="#2563eb"/>
				<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
				<circle cx="24" cy="10" r="4" fill="#7c3aed"/>
			</svg>
		{/if}
		<span class="mobile-brand-name">Agenda Educativa</span>
	</div>
	<button
		type="button"
		class="theme-toggle-btn"
		onclick={toggleTheme}
		aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
		title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
	>
		{#if theme === 'light'}
			<Moon size={18} />
		{:else}
			<Sun size={18} />
		{/if}
	</button>
</div>

<!-- Backdrop (solo mobile, cuando el drawer está abierto) -->
{#if mobileOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sidebar-backdrop" role="presentation" onclick={() => (mobileOpen = false)}></div>
{/if}

<aside class="sidebar" class:mobile-open={mobileOpen}>
	<!-- Brand -->
	<div class="sidebar-brand">
		<div class="brand-logo">
			{#if profile && profile.school_logo_url}
				<img src={profile.school_logo_url} alt="Logo" class="custom-school-logo" />
			{:else}
				<svg width="28" height="28" viewBox="0 0 32 32" fill="none">
					<rect width="32" height="32" rx="9" fill="#2563eb"/>
					<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
					<circle cx="24" cy="10" r="4" fill="#7c3aed"/>
				</svg>
			{/if}
		</div>
		<div class="brand-text">
			<span class="brand-name">Agenda</span>
			<span class="brand-sub">Educativa</span>
		</div>
		<button
			type="button"
			class="theme-toggle-btn"
			onclick={toggleTheme}
			aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
			title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
		>
			{#if theme === 'light'}
				<Moon size={16} />
			{:else}
				<Sun size={16} />
			{/if}
		</button>
	</div>

	<div class="sidebar-divider"></div>

	<!-- Navigation -->
	<nav class="sidebar-nav" aria-label="Navegación principal">
		{#each visibleGroups as group}
			<div class="nav-group">
				<span class="nav-group-label">{group.label}</span>
				{#each group.items as item}
					<a
						href={item.href}
						class="nav-item"
						class:active={currentPath.startsWith(item.href)}
						aria-current={currentPath.startsWith(item.href) ? 'page' : undefined}
					>
						<span class="nav-icon"><item.icon size={18} /></span>
						<span class="nav-label">{item.label}</span>
					</a>
				{/each}
			</div>
		{/each}
	</nav>

	<div class="sidebar-spacer"></div>

	<!-- User Profile -->
	{#if profile}
		<div class="sidebar-profile">
			<div
				class="profile-avatar"
				style="background: {avatarColor(profile.role)}"
				aria-hidden="true"
			>
				{getInitials(profile.full_name)}
			</div>
			<div class="profile-info">
				<span class="profile-name">{profile.full_name ?? 'Usuario'}</span>
				<span class="badge {roleClass[profile.role]} profile-role-badge">
					{roleLabel[profile.role]}
				</span>
			</div>
		</div>
	{/if}

	<!-- Logout -->
	<form method="POST" action="/logout" class="sidebar-logout">
		<button type="submit" class="logout-btn" id="btn-logout">
			<LogOut size={16} />
			Cerrar sesión
		</button>
	</form>
</aside>

<style>
	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		width: var(--sidebar-width);
		height: 100vh;
		background: var(--bg-surface);
		border-right: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		padding: 1.25rem 0.75rem;
		z-index: 40;
		overflow-y: auto;
		overflow-x: hidden;
	}

	/* Brand */
	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.25rem 0.5rem;
		margin-bottom: 0.25rem;
	}
	.brand-logo {
		flex-shrink: 0;
		filter: drop-shadow(0 0 8px light-dark(rgba(37,99,235,0.25), rgba(59,130,246,0.4)));
	}
	.custom-school-logo {
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: 6px;
	}
	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1;
		flex: 1;
		min-width: 0;
	}
	.brand-name {
		font-family: 'Plus Jakarta Sans', sans-serif;
		font-weight: 800;
		font-size: 1rem;
		color: var(--text-primary);
	}
	.brand-sub {
		font-size: 0.7rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.sidebar-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: 1rem 0;
	}

	/* Nav */
	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.nav-group-label {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		padding: 0 0.75rem;
		margin-bottom: 0.375rem;
	}
	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5625rem 0.75rem;
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: all var(--transition-fast);
		white-space: nowrap;
		overflow: hidden;
	}
	.nav-item:hover {
		background: var(--bg-overlay);
		color: var(--text-primary);
	}
	.nav-item.active {
		background: var(--color-primary);
		color: var(--text-on-primary);
		font-weight: 600;
		box-shadow: var(--shadow-sm);
	}
	.nav-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}
	.nav-label { flex: 1; }

	.sidebar-spacer { flex: 1; }

	/* Profile */
	.sidebar-profile {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		margin-bottom: 0.5rem;
	}
	.profile-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		font-weight: 700;
		color: white;
		flex-shrink: 0;
	}
	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.profile-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.profile-role-badge {
		font-size: 0.65rem;
		padding: 0.1rem 0.45rem;
		width: fit-content;
	}

	/* Logout */
	.sidebar-logout { margin-top: 0.25rem; }
	.logout-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all var(--transition-fast);
		font-family: inherit;
	}
	.logout-btn:hover {
		background: light-dark(rgba(220, 38, 38, 0.08), rgba(239, 68, 68, 0.1));
		color: light-dark(#b91c1c, #fca5a5);
	}

	/* Mobile top bar + drawer */
	.mobile-topbar {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--mobile-topbar-height, 56px);
		align-items: center;
		gap: 0.75rem;
		padding: 0 1rem;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-subtle);
		z-index: 45;
	}
	.mobile-menu-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		background: none;
		border: none;
		color: var(--text-primary);
		cursor: pointer;
		flex-shrink: 0;
	}
	.mobile-menu-btn:hover { background: var(--bg-elevated); }
	.mobile-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
		flex: 1;
	}
	.mobile-brand-logo {
		width: 22px;
		height: 22px;
		object-fit: contain;
		border-radius: 5px;
		flex-shrink: 0;
	}
	.mobile-brand-name {
		font-family: 'Plus Jakarta Sans', sans-serif;
		font-weight: 800;
		font-size: 0.9375rem;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.theme-toggle-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 999px;
		background: none;
		border: 1px solid var(--border-default);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.theme-toggle-btn:hover {
		color: var(--text-primary);
		border-color: var(--border-strong);
		background: var(--bg-elevated);
	}

	.sidebar-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		z-index: 55;
	}

	@media (max-width: 768px) {
		.mobile-topbar { display: flex; }
		.sidebar-backdrop { display: block; }
		.sidebar {
			transform: translateX(-100%);
			transition: transform var(--transition-base);
			z-index: 60;
			box-shadow: var(--shadow-lg);
		}
		.sidebar.mobile-open { transform: translateX(0); }
	}
</style>
