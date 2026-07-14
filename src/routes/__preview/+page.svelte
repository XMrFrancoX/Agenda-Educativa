<script lang="ts">
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	let open = $state(true);
</script>

<ConfirmDialog
	bind:open
	title="Eliminar escuela"
	description="¿Estás seguro de eliminar TOTALMENTE esta escuela y todos sus datos? Esta acción no se puede deshacer."
	confirmLabel="Eliminar definitivamente"
	onConfirm={() => {}}
/>
