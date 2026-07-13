<script lang="ts">
	import { AlertOctagon } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Acceso Suspendido — Agenda Educativa</title>
</svelte:head>

<div class="suspended-container">
	<div class="suspended-card">
		<AlertOctagon size="64" class="icon" />
		<h1>Acceso Suspendido</h1>
		<p>La institución a la que pertenecés se encuentra temporalmente suspendida.</p>
		<p class="subtitle">Por favor, comunicate con la administración de tu escuela para más información. Actualmente no podés acceder al calendario ni a tus tareas.</p>
	</div>
</div>

<style>
	.suspended-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 4rem);
		padding: 2rem;
	}
	.suspended-card {
		background: var(--bg-surface);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-lg);
		padding: 3rem 2rem;
		text-align: center;
		max-width: 500px;
		box-shadow: 0 10px 25px color-mix(in srgb, var(--color-danger) 10%, transparent);
	}
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1rem;
	}
	p {
		color: var(--text-secondary);
		font-size: 1rem;
		line-height: 1.5;
		margin-bottom: 0.5rem;
	}
	.subtitle {
		font-size: 0.875rem;
		color: var(--text-muted);
	}
</style>
