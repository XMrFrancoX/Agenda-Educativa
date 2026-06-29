<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createSupabaseBrowserClient } from '$lib/supabase';

	let { children, data } = $props();

	let primaryColor = $derived(data.tenant?.primary_color || data.profile?.school_primary_color);
	let logoUrl = $derived(data.tenant?.logo_url || data.profile?.school_logo_url);

	const supabase = createSupabaseBrowserClient();

	onMount(() => {
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	{#if logoUrl}
		<link rel="icon" href={logoUrl} />
	{/if}
	{#if primaryColor}
		{@html `<style>
			:root {
				--color-primary: ${primaryColor} !important;
				--color-primary-hover: color-mix(in srgb, ${primaryColor} 85%, black) !important;
				
				/* Background Tinting (Deep customization) */
				--bg-base: color-mix(in srgb, ${primaryColor} 3%, #0f0f17) !important;
				--bg-surface: color-mix(in srgb, ${primaryColor} 6%, #16161f) !important;
				--bg-elevated: color-mix(in srgb, ${primaryColor} 10%, #1e1e2e) !important;
				--bg-overlay: color-mix(in srgb, ${primaryColor} 15%, #252538) !important;
				--bg-highlight: color-mix(in srgb, ${primaryColor} 20%, #2e2e45) !important;
				
				/* Text Tinting */
				--text-primary: color-mix(in srgb, ${primaryColor} 10%, #e2e8f0) !important;
				--text-secondary: color-mix(in srgb, ${primaryColor} 20%, #94a3b8) !important;
				--text-muted: color-mix(in srgb, ${primaryColor} 15%, #64748b) !important;
				
				/* Shadows and Accents */
				--shadow-glow: 0 0 24px color-mix(in srgb, ${primaryColor} 25%, transparent) !important;
				--color-primary-alpha-12: color-mix(in srgb, ${primaryColor} 15%, transparent) !important;
				--color-primary-light: color-mix(in srgb, ${primaryColor} 70%, white) !important;
			}
			
			/* Dynamic Calendar Overrides */
			.fc {
				--fc-today-bg-color: color-mix(in srgb, ${primaryColor} 10%, transparent) !important;
			}
		</style>`}
	{/if}
</svelte:head>

{@render children()}
