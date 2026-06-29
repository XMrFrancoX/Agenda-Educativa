<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';

	let { children, data } = $props();
</script>


<div class="app-layout">
	<Sidebar profile={data.profile} />
	<main class="main-content">
		{@render children()}
	</main>
</div>
