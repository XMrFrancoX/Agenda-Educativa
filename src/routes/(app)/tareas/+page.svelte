<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showCreateDialog = $state(false);
	let newTitle = $state('');
	let newDesc = $state('');
	let newDueDate = $state('');
	let newPriority = $state('medium');
	let creating = $state(false);
	let formError = $state('');

	import { Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	const columns = [
		{ key: 'pending',     label: 'Pendiente',    color: '#0a3055', icon: Clock },
		{ key: 'in_progress', label: 'En Progreso',  color: '#f59e0b', icon: RefreshCw },
		{ key: 'done',        label: 'Completado',   color: '#10b981', icon: CheckCircle2 }
	] as const;

	type Status = 'pending' | 'in_progress' | 'done';

	function tasksByStatus(status: Status) {
		return (data.tasks ?? []).filter((t) => t.status === status);
	}

	function formatDate(dt: string | null) {
		if (!dt) return null;
		const d = new Date(dt);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const isOverdue = d < today;
		return {
			text: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
			overdue: isOverdue
		};
	}

	function priorityLabel(p: string) {
		return { low: 'Baja', medium: 'Media', high: 'Alta' }[p] ?? p;
	}
	function priorityClass(p: string) {
		return { low: 'badge-success', medium: 'badge-warning', high: 'badge-danger' }[p] ?? '';
	}

	async function moveTask(id: string, newStatus: Status) {
		const fd = new FormData();
		fd.append('id', id);
		fd.append('status', newStatus);
		await fetch('?/updateStatus', { method: 'POST', body: fd });
		await invalidateAll();
	}

	function closeCreate() {
		showCreateDialog = false;
		newTitle = '';
		newDesc = '';
		newDueDate = '';
		newPriority = 'medium';
		formError = '';
	}
</script>

<svelte:head>
	<title>Tareas — Agenda Educativa</title>
	<meta name="description" content="Gestión de tareas escolares en tablero Kanban" />
</svelte:head>

<div class="page-header">
	<div class="page-header-content">
		<div>
			<h1 class="page-title">Mis Tareas</h1>
			<p class="page-subtitle">Organizá tu trabajo con el tablero Kanban</p>
		</div>
		<button class="btn btn-primary" onclick={() => (showCreateDialog = true)} id="btn-new-task">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			Nueva Tarea
		</button>
	</div>
</div>

<div class="page-body">
	<!-- Stats bar -->
	<div class="tasks-stats">
		{#each columns as col}
			<div class="stat-chip" style="border-color: {col.color}20">
				<span class="stat-count" style="color: {col.color}">{tasksByStatus(col.key).length}</span>
				<span class="stat-label">{col.label}</span>
			</div>
		{/each}
	</div>

	<!-- Kanban board -->
	<div class="kanban-board">
		{#each columns as col}
			{@const Icon = col.icon}
			<div class="kanban-column">
				<!-- Column header -->
				<div class="kanban-column-header" style="border-top: 3px solid {col.color}">
					<span class="kanban-column-title" style="color: {col.color}; display: flex; align-items: center; gap: 0.35rem;">
						<Icon size="16" />
						{col.label}
					</span>
					<span class="kanban-column-count">{tasksByStatus(col.key).length}</span>
				</div>

				<!-- Tasks -->
				<div class="kanban-cards">
					{#each tasksByStatus(col.key) as task (task.id)}
						{@const due = formatDate(task.due_date)}
						<div class="task-card animate-fadeIn">
							<div class="task-card-header">
								<span class="task-title">{task.title}</span>
								<!-- Delete -->
								<form method="POST" action="?/deleteTask" use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') await invalidateAll();
									};
								}}>
									<input type="hidden" name="id" value={task.id} />
									<button type="submit" class="task-delete-btn" aria-label="Eliminar tarea" id="btn-delete-task-{task.id}">
										<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
										</svg>
									</button>
								</form>
							</div>

							{#if task.description}
								<p class="task-desc">{task.description}</p>
							{/if}

							<div class="task-card-footer">
								<span class="badge {priorityClass(task.priority)} task-priority-badge">
									{priorityLabel(task.priority)}
								</span>
								{#if due}
									<span class="task-due" class:overdue={due.overdue}>
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
											<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
										</svg>
										{due.text}
									</span>
								{/if}
							</div>

							<!-- Move to other columns -->
							<div class="task-move-actions">
								{#each columns.filter(c => c.key !== col.key) as targetCol}
									<button
										class="move-btn"
										onclick={() => moveTask(task.id, targetCol.key)}
										style="color: {targetCol.color}"
										id="btn-move-{task.id}-to-{targetCol.key}"
									>
										→ {targetCol.label}
									</button>
								{/each}
							</div>
						</div>
					{:else}
						<div class="empty-state column-empty">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-state-icon">
								<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
							</svg>
							<span class="empty-state-title">Sin tareas</span>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Create Task Dialog -->
{#if showCreateDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dialog-backdrop" onclick={(e) => { if ((e.target as HTMLElement).classList.contains('dialog-backdrop')) closeCreate(); }}>
		<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="create-task-title">
			<div class="dialog-header">
				<h2 class="dialog-title" id="create-task-title">Nueva Tarea</h2>
				<button class="dialog-close" onclick={closeCreate} title="Cerrar ventana">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>

			{#if formError}
				<Alert variant="destructive" class="mb-4">
					<AlertCircle size={16} />
					<AlertDescription>{formError}</AlertDescription>
				</Alert>
			{/if}

			<form method="POST" action="?/createTask" use:enhance={() => {
				creating = true;
				return async ({ result, update }) => {
					creating = false;
					if (result.type === 'success') {
						await invalidateAll();
						closeCreate();
					} else if (result.type === 'failure') {
						formError = (result.data?.error as string) ?? 'Error al crear la tarea.';
					} else {
						await update();
					}
				};
			}}>
				<div class="form-group">
					<label class="input-label" for="task-title">Título *</label>
					<input id="task-title" name="title" type="text" class="input" placeholder="¿Qué necesitás hacer?" bind:value={newTitle} required />
				</div>
				<div class="form-group">
					<label class="input-label" for="task-desc">Descripción</label>
					<textarea id="task-desc" name="description" class="input" style="resize:vertical;min-height:70px;font-family:inherit" placeholder="Detalles opcionales..." bind:value={newDesc} rows="3"></textarea>
				</div>
				<div class="form-row">
					<div class="form-group">
						<label class="input-label" for="task-due">Fecha límite</label>
						<input id="task-due" name="due_date" type="date" class="input" bind:value={newDueDate} />
					</div>
					<div class="form-group">
						<label class="input-label" for="task-priority">Prioridad</label>
						<select id="task-priority" name="priority" class="input" bind:value={newPriority}>
							<option value="low">Baja</option>
							<option value="medium">Media</option>
							<option value="high">Alta</option>
						</select>
					</div>
				</div>
				<div style="display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-subtle)">
					<button type="button" class="btn btn-ghost" onclick={closeCreate}>Cancelar</button>
					<button type="submit" class="btn btn-primary" disabled={creating} id="btn-create-task-submit">
						{#if creating}<span class="spinner"></span>{/if}
						Crear Tarea
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.page-header-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}
	.tasks-stats {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
		flex-wrap: wrap;
	}
	.stat-chip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--bg-elevated);
		border: 1px solid;
		border-radius: var(--radius-md);
	}
	.stat-count { font-size: 1.25rem; font-weight: 800; line-height: 1; }
	.stat-label { font-size: 0.8125rem; color: var(--text-muted); }

	.kanban-cards {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		min-height: 100px;
	}

	.task-card {
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
		cursor: default;
	}
	.task-card:hover {
		border-color: var(--border-default);
		box-shadow: var(--shadow-sm);
	}
	.task-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.task-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.4;
	}
	.task-delete-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.1rem;
		border-radius: 4px;
		flex-shrink: 0;
		transition: color var(--transition-fast), background var(--transition-fast);
		display: flex;
	}
	.task-delete-btn:hover { color: var(--color-danger); background: rgba(239,68,68,0.1); }
	.task-desc {
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.5;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	.task-card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.task-priority-badge { font-size: 0.7rem; padding: 0.1rem 0.5rem; }
	.task-due {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}
	.task-due.overdue { color: var(--color-danger); }
	.task-move-actions {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.375rem;
		border-top: 1px solid var(--border-subtle);
	}
	.move-btn {
		background: none;
		border: none;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.1rem 0;
		font-family: inherit;
		opacity: 0.7;
		transition: opacity var(--transition-fast);
	}
	.move-btn:hover { opacity: 1; }
	.column-empty {
		padding: 2rem 1rem;
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
	}
</style>
