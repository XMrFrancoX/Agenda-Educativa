<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { TriangleAlert } from '@lucide/svelte';

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Eliminar',
		cancelLabel = 'Cancelar',
		destructive = true,
		onConfirm
	}: {
		open?: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		destructive?: boolean;
		onConfirm: () => void;
	} = $props();

	function handleConfirm() {
		open = false;
		onConfirm();
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content class="data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg gap-6 p-6 duration-200">
		<AlertDialog.Header>
			<AlertDialog.Media class={destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}>
				<TriangleAlert size={20} />
			</AlertDialog.Media>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description class="mt-1">{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer class="border-t-0 bg-transparent mx-0 mb-0 p-0">
			<AlertDialog.Cancel>{cancelLabel}</AlertDialog.Cancel>
			<AlertDialog.Action variant={destructive ? 'destructive' : 'default'} onclick={handleConfirm}>
				{confirmLabel}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
