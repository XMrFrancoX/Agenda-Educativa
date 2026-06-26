<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children, data } = $props();
</script>

<svelte:head>
	{#if data.profile?.school_logo_url}
		<link rel="icon" href={data.profile.school_logo_url} />
	{/if}
	{#if data.profile?.school_primary_color}
		{@html `<style>
			:root {
				--color-primary: ${data.profile.school_primary_color} !important;
				--color-primary-hover: color-mix(in srgb, ${data.profile.school_primary_color} 85%, black) !important;
				
				/* Background Tinting (Deep customization) */
				--bg-base: color-mix(in srgb, ${data.profile.school_primary_color} 3%, #0f0f17) !important;
				--bg-surface: color-mix(in srgb, ${data.profile.school_primary_color} 6%, #16161f) !important;
				--bg-elevated: color-mix(in srgb, ${data.profile.school_primary_color} 10%, #1e1e2e) !important;
				--bg-overlay: color-mix(in srgb, ${data.profile.school_primary_color} 15%, #252538) !important;
				--bg-highlight: color-mix(in srgb, ${data.profile.school_primary_color} 20%, #2e2e45) !important;
				
				/* Text Tinting */
				--text-primary: color-mix(in srgb, ${data.profile.school_primary_color} 10%, #e2e8f0) !important;
				--text-secondary: color-mix(in srgb, ${data.profile.school_primary_color} 20%, #94a3b8) !important;
				--text-muted: color-mix(in srgb, ${data.profile.school_primary_color} 15%, #64748b) !important;
				
				/* Shadows and Accents */
				--shadow-glow: 0 0 24px color-mix(in srgb, ${data.profile.school_primary_color} 25%, transparent) !important;
				--color-primary-alpha-12: color-mix(in srgb, ${data.profile.school_primary_color} 15%, transparent) !important;
				--color-primary-light: color-mix(in srgb, ${data.profile.school_primary_color} 70%, white) !important;
			}
			
			/* Dynamic Calendar Overrides */
			.fc {
				--fc-today-bg-color: color-mix(in srgb, ${data.profile.school_primary_color} 10%, transparent) !important;
			}
		</style>`}
	{/if}
</svelte:head>
<div class="app-layout">
	<Sidebar profile={data.profile} />
	<main class="main-content">
		{@render children()}
	</main>
</div>
