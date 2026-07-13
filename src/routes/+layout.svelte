<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { getInitialTheme, applyTheme, type Theme } from '$lib/theme';
	import { Sun, Moon } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { Toaster } from 'svelte-sonner';

	let { children, data } = $props();

	// El Sidebar (rutas del grupo "(app)") trae su propio toggle de tema;
	// este botón flotante es solo para las pantallas sin sidebar (login, etc.)
	let hasSidebar = $derived($page.route.id?.startsWith('/(app)') ?? false);

	let primaryColor = $derived(data.tenant?.primary_color || data.profile?.school_primary_color);
	let logoUrl = $derived(data.tenant?.logo_url || data.profile?.school_logo_url);

	const supabase = createSupabaseBrowserClient();

	let theme = $state<Theme>('light');

	onMount(() => {
		theme = getInitialTheme();

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => subscription.unsubscribe();
	});

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		applyTheme(theme);
	}
</script>

<svelte:head>
	{#if logoUrl}
		<link rel="icon" href={logoUrl} />
	{/if}
	{#if primaryColor}
		{@html `<style>
			/* Color institucional del tenant, adaptado a cada tema */
			:root[data-theme='light'] {
				--color-primary: ${primaryColor} !important;
				--color-primary-hover: color-mix(in srgb, ${primaryColor} 85%, black) !important;
				--color-primary-light: color-mix(in srgb, ${primaryColor} 65%, black) !important;
				--color-primary-alpha-12: color-mix(in srgb, ${primaryColor} 12%, transparent) !important;
				--shadow-glow: 0 0 20px color-mix(in srgb, ${primaryColor} 20%, transparent) !important;

				--bg-base: color-mix(in srgb, ${primaryColor} 2%, #f8fafc) !important;
				--bg-surface: color-mix(in srgb, ${primaryColor} 3%, #ffffff) !important;
				--bg-elevated: color-mix(in srgb, ${primaryColor} 3%, #ffffff) !important;
				--bg-overlay: color-mix(in srgb, ${primaryColor} 5%, #f1f5f9) !important;
				--bg-highlight: color-mix(in srgb, ${primaryColor} 8%, #e2e8f0) !important;
			}
			:root[data-theme='dark'] {
				--color-primary: ${primaryColor} !important;
				--color-primary-hover: color-mix(in srgb, ${primaryColor} 85%, black) !important;
				--color-primary-light: color-mix(in srgb, ${primaryColor} 70%, white) !important;
				--color-primary-alpha-12: color-mix(in srgb, ${primaryColor} 15%, transparent) !important;
				--shadow-glow: 0 0 24px color-mix(in srgb, ${primaryColor} 25%, transparent) !important;

				--bg-base: color-mix(in srgb, ${primaryColor} 3%, #0b1220) !important;
				--bg-surface: color-mix(in srgb, ${primaryColor} 6%, #0f172a) !important;
				--bg-elevated: color-mix(in srgb, ${primaryColor} 10%, #111827) !important;
				--bg-overlay: color-mix(in srgb, ${primaryColor} 15%, #1e293b) !important;
				--bg-highlight: color-mix(in srgb, ${primaryColor} 20%, #263449) !important;
			}

			/* Dynamic Calendar Overrides */
			.fc {
				--fc-today-bg-color: color-mix(in srgb, ${primaryColor} 10%, transparent) !important;
			}
		</style>`}
	{/if}
</svelte:head>

<Toaster richColors position="top-right" closeButton />

{#if !hasSidebar}
	<button
		type="button"
		class="theme-toggle"
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
{/if}

{@render children()}

<style>
	.theme-toggle {
		position: fixed;
		top: 12px;
		right: 12px;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		color: var(--text-secondary);
		cursor: pointer;
		box-shadow: var(--shadow-sm);
		transition: all var(--transition-fast);
	}
	.theme-toggle:hover {
		color: var(--text-primary);
		border-color: var(--border-strong);
	}
</style>
