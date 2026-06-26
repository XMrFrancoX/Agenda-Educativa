<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	let { profile } = $props<{
		profile: {
			id: string;
			full_name: string | null;
			role: 'teacher' | 'director' | 'admin';
			school_id: string;
			phone: string | null;
			avatar_url: string | null;
		} | null;
	}>();

	const roleLabel: Record<string, string> = {
		teacher: 'Docente',
		director: 'Director/a',
		admin: 'Administrador'
	};

	const roleClass: Record<string, string> = {
		teacher: 'role-teacher',
		director: 'role-director',
		admin: 'role-admin'
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
		if (role === 'director') return 'linear-gradient(135deg, #8b5cf6, #6366f1)';
		if (role === 'teacher') return 'linear-gradient(135deg, #06b6d4, #0284c7)';
		return 'linear-gradient(135deg, #f59e0b, #d97706)';
	}

	const navItems = [
		{
			href: '/calendario',
			label: 'Calendario',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
			roles: ['teacher', 'director', 'admin']
		},
		{
			href: '/tareas',
			label: 'Mis Tareas',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
			roles: ['teacher', 'director', 'admin']
		},
		{
			href: '/staff',
			label: 'Planificador Staff',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
			roles: ['director', 'admin']
		},
		{
			href: '/reuniones',
			label: 'Reuniones',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
			roles: ['teacher', 'director', 'admin']
		},
		{
			href: '/configuracion',
			label: 'Configuración',
			icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
			roles: ['director', 'admin']
		}
	];

	const currentPath = $derived($page.url.pathname);
	const userRole = $derived(profile?.role ?? 'teacher');
	const visibleNav = $derived(navItems.filter((item) => item.roles.includes(userRole)));
</script>

<aside class="sidebar">
	<!-- Brand -->
	<div class="sidebar-brand">
		<div class="brand-logo">
			<svg width="28" height="28" viewBox="0 0 32 32" fill="none">
				<rect width="32" height="32" rx="9" fill="#6366f1"/>
				<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
				<circle cx="24" cy="10" r="4" fill="#8b5cf6"/>
			</svg>
		</div>
		<div class="brand-text">
			<span class="brand-name">Agenda</span>
			<span class="brand-sub">Educativa</span>
		</div>
	</div>

	<div class="sidebar-divider"></div>

	<!-- Navigation -->
	<nav class="sidebar-nav" aria-label="Navegación principal">
		{#each visibleNav as item}
			<a
				href={item.href}
				class="nav-item"
				class:active={currentPath.startsWith(item.href)}
				aria-current={currentPath.startsWith(item.href) ? 'page' : undefined}
			>
				<span class="nav-icon">{@html item.icon}</span>
				<span class="nav-label">{item.label}</span>
				{#if currentPath.startsWith(item.href)}
					<span class="nav-active-indicator"></span>
				{/if}
			</a>
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
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
				<polyline points="16 17 21 12 16 7"/>
				<line x1="21" y1="12" x2="9" y2="12"/>
			</svg>
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
		filter: drop-shadow(0 0 8px rgba(99,102,241,0.4));
	}
	.brand-text {
		display: flex;
		flex-direction: column;
		line-height: 1;
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
		gap: 0.25rem;
	}
	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0.75rem;
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
		background: var(--bg-elevated);
		color: var(--text-primary);
	}
	.nav-item.active {
		background: rgba(99, 102, 241, 0.12);
		color: #a5b4fc;
	}
	.nav-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}
	.nav-label { flex: 1; }
	.nav-active-indicator {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 60%;
		background: var(--color-primary);
		border-radius: 2px 0 0 2px;
	}

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
		background: rgba(239, 68, 68, 0.1);
		color: #fca5a5;
	}
</style>
