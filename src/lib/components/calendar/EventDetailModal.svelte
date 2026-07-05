<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let {
		open = $bindable(false),
		event = null,
		currentUserId = '',
		onEdit,
		onClose
	}: {
		open: boolean;
		event?: Record<string, any> | null;
		currentUserId: string;
		onEdit?: (event: Record<string, any>) => void;
		onClose?: () => void;
	} = $props();

	let deleting = $state(false);

	const isOwner = $derived(event?.created_by === currentUserId);

	function formatDateTime(dt: string | null, allDay: boolean) {
		if (!dt) return '—';
		const d = new Date(dt);
		if (allDay) return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
		return d.toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	function close() {
		open = false;
		onClose?.();
	}

	function handleBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('dialog-backdrop')) close();
	}
</script>

{#if open && event}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dialog-backdrop" onclick={handleBackdrop}>
		<div class="dialog detail-dialog" role="dialog" aria-modal="true">
			<!-- Color bar from category -->
			{#if event.event_categories?.color}
				<div class="event-color-bar" style="background: {event.event_categories.color}"></div>
			{/if}

			<div class="dialog-header">
				<div class="detail-title-area">
					{#if event.event_categories}
						<span class="category-badge" style="background: {event.event_categories.color}20; color: {event.event_categories.color}; border-color: {event.event_categories.color}40">
							{event.event_categories.name}
						</span>
					{/if}
					<h2 class="dialog-title">{event.title}</h2>
				</div>
				<button class="dialog-close" onclick={close} aria-label="Cerrar">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			<div class="detail-body">
				<!-- Date/Time -->
				<div class="detail-row">
					<span class="detail-icon">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
						</svg>
					</span>
					<div class="detail-content">
						<span class="detail-label">Inicio</span>
						<span class="detail-value">{formatDateTime(event.starts_at, event.all_day)}</span>
						{#if event.ends_at}
							<span class="detail-label" style="margin-top:0.25rem">Fin</span>
							<span class="detail-value">{formatDateTime(event.ends_at, event.all_day)}</span>
						{/if}
					</div>
				</div>

				<!-- Location -->
				{#if event.location}
					<div class="detail-row">
						<span class="detail-icon">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
							</svg>
						</span>
						<div class="detail-content">
							<span class="detail-label">Ubicación</span>
							<span class="detail-value">{event.location}</span>
						</div>
					</div>
				{/if}

				<!-- Description -->
				{#if event.description}
					<div class="detail-row">
						<span class="detail-icon">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
							</svg>
						</span>
						<div class="detail-content">
							<span class="detail-label">Descripción</span>
							<p class="detail-value detail-desc">{event.description}</p>
						</div>
					</div>
				{/if}

				<!-- Creator -->
				{#if event.profiles}
					<div class="detail-row">
						<span class="detail-icon">
							<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
							</svg>
						</span>
						<div class="detail-content">
							<span class="detail-label">Creado por</span>
							<span class="detail-value">{event.profiles.full_name ?? 'Usuario'}</span>
						</div>
					</div>
				{/if}

				<!-- Visibility -->
				<div class="detail-row">
					<span class="detail-icon">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
						</svg>
					</span>
					<div class="detail-content">
						<span class="detail-label">Visibilidad</span>
						<span class="detail-value">
							{#if event.visibility === 'school'}
								Toda la institución
							{:else if event.visibility === 'group'}
								Grupo de Staff
							{:else if event.visibility === 'course'}
								Curso de alumnos
							{:else}
								Solo yo
							{/if}
						</span>
					</div>
				</div>
			</div>

			<!-- Reunión vinculada: se gestiona desde Reuniones, no acá -->
			{#if event.meeting_id}
				<div class="detail-actions">
					<a class="btn btn-ghost" href="/reuniones">
						Gestionar en Reuniones
					</a>
				</div>
			{:else if isOwner}
				<div class="detail-actions">
					<button
						class="btn btn-ghost"
						onclick={() => { const ev = event!; close(); onEdit?.(ev); }}
						id="btn-edit-event"
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
						</svg>
						Editar
					</button>

					<form
						method="POST"
						action="?/deleteEvent"
						use:enhance={() => {
							deleting = true;
							return async ({ result }) => {
								deleting = false;
								if (result.type === 'success') {
									await invalidateAll();
									close();
								}
							};
						}}
					>
						<input type="hidden" name="id" value={event.id} />
						<button
							type="submit"
							class="btn btn-danger"
							disabled={deleting}
							id="btn-delete-event"
						>
							{#if deleting}
								<span class="spinner"></span>
							{:else}
								<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
								</svg>
							{/if}
							Eliminar
						</button>
					</form>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.detail-dialog {
		max-width: 480px;
		padding: 0;
		overflow: hidden;
	}
	.event-color-bar {
		height: 4px;
		width: 100%;
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
	}
	.dialog-header {
		padding: 1.5rem 1.5rem 0;
	}
	.detail-title-area {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.category-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 999px;
		border: 1px solid;
		width: fit-content;
		letter-spacing: 0.03em;
	}
	.dialog-title { font-size: 1.125rem; }

	.detail-body {
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.detail-row {
		display: flex;
		gap: 0.875rem;
		align-items: flex-start;
	}
	.detail-icon {
		color: var(--text-muted);
		flex-shrink: 0;
		margin-top: 2px;
		display: flex;
	}
	.detail-content {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.detail-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.detail-value {
		font-size: 0.875rem;
		color: var(--text-primary);
	}
	.detail-desc {
		line-height: 1.6;
		white-space: pre-wrap;
	}

	.detail-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1rem 1.5rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
	}
</style>
