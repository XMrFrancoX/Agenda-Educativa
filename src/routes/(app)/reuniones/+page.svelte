<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { Calendar, Users, MapPin, Clock, Plus, X, FileText, CheckCircle2, XCircle, Edit } from '@lucide/svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	// Modals
	let showCreate = $state(false);
	let showEdit = $state(false);

	// Confirmación de borrado de reunión
	let deleteMeetingOpen = $state(false);
	let meetingFormToDelete: HTMLFormElement | null = null;
	function requestDeleteMeeting(e: MouseEvent) {
		meetingFormToDelete = (e.currentTarget as HTMLElement).closest('form');
		deleteMeetingOpen = true;
	}
	function confirmDeleteMeeting() {
		meetingFormToDelete?.requestSubmit();
	}

	// States
	let creating = $state(false);
	let updatingMeeting = $state(false);
	let expandedMeeting = $state<string | null>(null);
	let editingMinutes = $state<string | null>(null);
	let savingMinutes = $state(false);

	// Edición
	let editingMeeting = $state<Record<string, any> | null>(null);
	let editTitle = $state('');
	let editDescription = $state('');
	let editDate = $state('');
	let editDuration = $state(60);
	let editLocation = $state('');

	// Crear form
	let title = $state('');
	let description = $state('');
	let date = $state('');
	let duration = $state(60);
	let location = $state('');
	let selectedParticipants = $state<string[]>([]);

	function resetForm() {
		title = ''; description = ''; date = ''; duration = 60; location = '';
		selectedParticipants = [];
		showCreate = false;
	}

	function openEdit(meeting: Record<string, any>) {
		editingMeeting = meeting;
		editTitle = meeting.title ?? '';
		editDescription = meeting.description ?? '';
		editDate = meeting.date ? meeting.date.slice(0, 16) : '';
		editDuration = meeting.duration_min ?? 60;
		editLocation = meeting.location ?? '';
		showEdit = true;
	}

	function closeEdit() {
		showEdit = false;
		editingMeeting = null;
	}

	function toggleParticipant(id: string) {
		if (selectedParticipants.includes(id)) {
			selectedParticipants = selectedParticipants.filter(p => p !== id);
		} else {
			selectedParticipants = [...selectedParticipants, id];
		}
	}

	// La columna `date` se guarda como si la hora local fuera UTC (bug conocido de
	// almacenamiento). Sacamos el sufijo de zona horaria (Z o +hh:mm) para que el
	// navegador la trate como hora local y muestre el horario que se ingresó,
	// igual que hace el Calendario con starts_at/ends_at.
	function stripTz(dt: string) {
		return dt.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
	}
	function formatDate(dt: string) {
		const d = new Date(stripTz(dt));
		return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}
	function formatTime(dt: string) {
		const d = new Date(stripTz(dt));
		return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
	}
	function statusLabel(s: string) {
		return { scheduled: 'Programada', completed: 'Completada', cancelled: 'Cancelada', in_progress: 'En curso' }[s] ?? s;
	}
	function statusBadgeClass(s: string) {
		return { scheduled: 'badge-primary', completed: 'badge-success', cancelled: 'badge-danger', in_progress: 'badge-warning' }[s] ?? 'badge-muted';
	}
	function statusDotColor(s: string) {
		return { scheduled: 'var(--color-primary)', completed: 'var(--color-success)', cancelled: 'var(--color-danger)', in_progress: 'var(--color-warning)' }[s] ?? 'var(--text-muted)';
	}
	function isPast(dt: string) { return new Date(stripTz(dt)) < new Date(); }

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('dialog-backdrop')) {
			showCreate = false;
			showEdit = false;
		}
	}

	let upcomingMeetings = $derived(
		(data.meetings ?? []).filter(m => m.status === 'scheduled' && !isPast(m.date))
	);
	let pastMeetings = $derived(
		(data.meetings ?? []).filter(m => m.status !== 'scheduled' || isPast(m.date))
	);
</script>

<svelte:head>
	<title>Reuniones — Agenda Educativa</title>
	<meta name="description" content="Gestión de reuniones institucionales con actas y convocatorias" />
</svelte:head>

<div class="page-header">
	<div class="page-header-content">
		<div>
			<h1 class="page-title">Reuniones</h1>
			<p class="page-subtitle">Convocá reuniones, registrá actas y hacé seguimiento de acuerdos</p>
		</div>
		<button class="btn btn-primary" onclick={() => (showCreate = true)} id="btn-new-meeting">
			<Plus size="16" /> Nueva Reunión
		</button>
	</div>
</div>

<div class="page-body">
	<!-- Próximas -->
	<section class="meetings-section">
		<h2 class="section-heading">Próximas ({upcomingMeetings.length})</h2>

		{#if upcomingMeetings.length === 0}
			<div class="empty-state-card">
				<Calendar size="36" />
				<p>No hay reuniones programadas.</p>
				<button class="btn btn-primary mt-btn" onclick={() => (showCreate = true)}>
					<Plus size="14" /> Crear primera reunión
				</button>
			</div>
		{:else}
			<div class="meetings-grid">
				{#each upcomingMeetings as meeting (meeting.id)}
					<div class="meeting-card upcoming">
						<div class="meeting-card-header">
							<div class="meeting-date-badge">
								<span class="meeting-day">{new Date(stripTz(meeting.date)).getDate()}</span>
								<span class="meeting-month">{new Date(stripTz(meeting.date)).toLocaleDateString('es-AR', { month: 'short' }).replace('.','')}
								</span>
							</div>
							<div class="meeting-info">
								<h3 class="meeting-title">{meeting.title}</h3>
								<div class="meeting-meta">
									<span><Clock size="12" /> {formatTime(meeting.date)} · {meeting.duration_min} min</span>
									{#if meeting.location}<span><MapPin size="12" /> {meeting.location}</span>{/if}
								</div>
							</div>
							<div class="meeting-actions-top">
								<button type="button" class="icon-btn" title="Editar" onclick={() => openEdit(meeting)}>
									<Edit size="15" />
								</button>
								<form method="POST" action="?/updateStatus" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toast.success('Reunión marcada como completada.');
											await invalidateAll();
										} else {
											// @ts-ignore
											if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo actualizar el estado.');
											await update();
										}
									};
								}}>
									<input type="hidden" name="meeting_id" value={meeting.id} />
									<input type="hidden" name="status" value="completed" />
									<button type="submit" class="icon-btn text-success" title="Completada"><CheckCircle2 size="16" /></button>
								</form>
								<form method="POST" action="?/updateStatus" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											toast.success('Reunión cancelada.');
											await invalidateAll();
										} else {
											// @ts-ignore
											if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo actualizar el estado.');
											await update();
										}
									};
								}}>
									<input type="hidden" name="meeting_id" value={meeting.id} />
									<input type="hidden" name="status" value="cancelled" />
									<button type="submit" class="icon-btn text-danger" title="Cancelar"><XCircle size="16" /></button>
								</form>
							</div>
						</div>

						{#if meeting.description}
							<p class="meeting-description">{meeting.description}</p>
						{/if}

						<div class="participants-row">
							{#each (meeting.meeting_participants ?? []).slice(0, 6) as p}
								<div class="mini-avatar" title={p.profiles?.full_name ?? ''}>{(p.profiles?.full_name ?? 'U')[0].toUpperCase()}</div>
							{/each}
							{#if (meeting.meeting_participants ?? []).length > 6}
								<div class="mini-avatar more">+{(meeting.meeting_participants ?? []).length - 6}</div>
							{/if}
							<span class="participants-count">{(meeting.meeting_participants ?? []).length} convocados</span>
						</div>

						<div class="card-footer-actions">
							<form method="POST" action="?/deleteMeeting" use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										toast.success('Reunión eliminada.');
										await invalidateAll();
									} else {
										// @ts-ignore
										if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo eliminar la reunión.');
										await update();
									}
								};
							}}>
								<input type="hidden" name="meeting_id" value={meeting.id} />
								<button type="button" onclick={requestDeleteMeeting} class="btn btn-ghost btn-sm text-danger">
									<X size="12" /> Eliminar reunión
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Historial -->
	{#if pastMeetings.length > 0}
		<section class="meetings-section">
			<h2 class="section-heading">Historial ({pastMeetings.length})</h2>
			<div class="meetings-list">
				{#each pastMeetings as meeting (meeting.id)}
					<div class="meeting-row" class:expanded={expandedMeeting === meeting.id}>
						<button class="meeting-row-header"
							onclick={() => expandedMeeting = expandedMeeting === meeting.id ? null : meeting.id}
						>
							<span class="status-dot" style="background: {statusDotColor(meeting.status)}"></span>
							<div class="meeting-row-info">
								<span class="meeting-row-title">{meeting.title}</span>
								<span class="meeting-row-meta">{formatDate(meeting.date)} · {formatTime(meeting.date)}{meeting.location ? ' · ' + meeting.location : ''}</span>
							</div>
							<span class="badge {statusBadgeClass(meeting.status)}">{statusLabel(meeting.status)}</span>
							<span class="meeting-row-participants"><Users size="13" /> {(meeting.meeting_participants ?? []).length}</span>
						</button>

						{#if expandedMeeting === meeting.id}
							<div class="meeting-row-body">
								{#if meeting.description}
									<p class="meeting-description" style="margin-bottom:1rem;">{meeting.description}</p>
								{/if}

								<!-- Acta -->
								<div class="minutes-section">
									<div class="minutes-header">
										<FileText size="14" />
										<span>Acta de la reunión</span>
									</div>
									{#if editingMinutes === meeting.id}
										<form method="POST" action="?/updateMinutes" use:enhance={() => {
											savingMinutes = true;
											return async ({ result, update }) => {
												savingMinutes = false;
												if (result.type === 'success') {
													toast.success('Acta guardada.');
													editingMinutes = null;
													await invalidateAll();
												} else {
													// @ts-ignore
													if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo guardar el acta.');
													await update();
												}
											};
										}}>
											<input type="hidden" name="meeting_id" value={meeting.id} />
											<textarea name="minutes" rows={6} class="input textarea" placeholder="Escribí los puntos tratados, acuerdos y decisiones...">{meeting.minutes ?? ''}</textarea>
											<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
												<button type="submit" class="btn btn-primary btn-sm" disabled={savingMinutes}>
													{#if savingMinutes}<span class="spinner" style="width:12px;height:12px;margin-right:0.25rem;"></span>{/if}
													Guardar Acta
												</button>
												<button type="button" class="btn btn-ghost btn-sm" onclick={() => editingMinutes = null}>Cancelar</button>
											</div>
										</form>
									{:else}
										<button type="button" class="minutes-display" onclick={() => editingMinutes = meeting.id}>
											{#if meeting.minutes}
												<p style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-secondary);line-height:1.6;margin:0;text-align:left;">{meeting.minutes}</p>
											{:else}
												<p style="font-size:0.85rem;color:var(--text-muted);font-style:italic;margin:0;">Sin acta registrada. Hacé clic para agregar.</p>
											{/if}
											<span class="edit-hint">Clic para editar</span>
										</button>
									{/if}
								</div>

								<!-- Participantes -->
								<div class="participants-row" style="margin-top:1rem;">
									{#each (meeting.meeting_participants ?? []) as p}
										<div class="mini-avatar">{(p.profiles?.full_name ?? 'U')[0].toUpperCase()}</div>
									{/each}
									<span class="participants-count">{(meeting.meeting_participants ?? []).length} participantes</span>
								</div>

								<!-- Acciones -->
								<div class="history-actions">
									<button type="button" class="btn btn-ghost btn-sm" onclick={() => openEdit(meeting)}>
										<Edit size="13" /> Editar
									</button>
									{#if meeting.status !== 'completed'}
										<form method="POST" action="?/updateStatus" use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') {
													toast.success('Reunión marcada como completada.');
													await invalidateAll();
												} else {
													// @ts-ignore
													if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo actualizar el estado.');
													await update();
												}
											};
										}}>
											<input type="hidden" name="meeting_id" value={meeting.id} />
											<input type="hidden" name="status" value="completed" />
											<button type="submit" class="btn btn-ghost btn-sm text-success"><CheckCircle2 size="13" /> Completada</button>
										</form>
									{/if}
									<form method="POST" action="?/deleteMeeting" use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												toast.success('Reunión eliminada.');
												expandedMeeting = null;
												await invalidateAll();
											} else {
												// @ts-ignore
												if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo eliminar la reunión.');
												await update();
											}
										};
									}}>
										<input type="hidden" name="meeting_id" value={meeting.id} />
										<button type="button" onclick={requestDeleteMeeting} class="btn btn-ghost btn-sm text-danger"><X size="13" /> Eliminar</button>
									</form>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if showCreate}
	<div class="dialog-backdrop" onclick={handleBackdropClick}>
		<div class="dialog meeting-dialog" role="dialog" aria-modal="true" aria-labelledby="create-meeting-title" onclick={e => e.stopPropagation()}>
		<div class="dialog-scroll">
			<div class="dialog-header">
				<h2 class="dialog-title" id="create-meeting-title">Nueva Reunión</h2>
				<button class="dialog-close" onclick={() => (showCreate = false)} aria-label="Cerrar">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>

			<form method="POST" action="?/createMeeting" use:enhance={() => {
				creating = true;
				return async ({ result, update }) => {
					creating = false;
					if (result.type === 'success') {
						toast.success('Reunión creada.');
						resetForm();
						await invalidateAll();
					} else {
						// @ts-ignore
						if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo crear la reunión.');
						await update();
					}
				};
			}}>
				<div class="form-grid">
					<div class="form-group full-width">
						<label for="c-title" class="input-label">Título *</label>
						<input id="c-title" type="text" name="title" class="input" placeholder="Ej: Reunión de coordinación docente" bind:value={title} required />
					</div>
					<div class="form-group full-width">
						<label for="c-desc" class="input-label">Descripción / Temario</label>
						<textarea id="c-desc" name="description" class="input textarea" rows={3} placeholder="Puntos a tratar..." bind:value={description}></textarea>
					</div>
					<div class="form-group">
						<label for="c-date" class="input-label">Fecha y Hora *</label>
						<input id="c-date" type="datetime-local" name="date" class="input" bind:value={date} required />
					</div>
					<div class="form-group">
						<label for="c-duration" class="input-label">Duración (minutos)</label>
						<input id="c-duration" type="number" name="duration_min" class="input" min="15" max="480" step="15" bind:value={duration} />
					</div>
					<div class="form-group full-width">
						<label for="c-location" class="input-label">Lugar / Link</label>
						<input id="c-location" type="text" name="location" class="input" placeholder="Ej: Sala de reuniones / meet.google.com/xxx" bind:value={location} />
					</div>
					<div class="form-group full-width">
						<label class="input-label">Convocar participantes</label>
						<div class="participants-grid">
							{#each data.staff as member}
								<label class="participant-chip" class:selected={selectedParticipants.includes(member.id)}>
									<input type="hidden" name="participants" value={member.id} disabled={!selectedParticipants.includes(member.id)} />
									<input type="checkbox" class="sr-only" checked={selectedParticipants.includes(member.id)} onchange={() => toggleParticipant(member.id)} />
									<div class="participant-avatar" style="background: {member.role === 'director' ? 'var(--role-director)' : 'var(--role-teacher)'}">
										{(member.full_name ?? 'U')[0].toUpperCase()}
									</div>
									<span>{member.full_name ?? '(sin nombre)'}</span>
									{#if selectedParticipants.includes(member.id)}
										<CheckCircle2 size="14" style="color: var(--color-success); margin-left: auto;" />
									{/if}
								</label>
							{/each}
							{#if data.staff.length === 0}
								<p style="font-size:0.85rem;color:var(--text-muted);font-style:italic;">No hay personal registrado.</p>
							{/if}
						</div>
					</div>
				</div>
				<div class="dialog-actions">
					<button type="button" class="btn btn-ghost" onclick={() => resetForm()}>Cancelar</button>
					<button type="submit" class="btn btn-primary" disabled={creating}>
						{#if creating}<span class="spinner" style="width:16px;height:16px;margin-right:0.5rem;"></span>{/if}
						Crear Reunión
					</button>
				</div>
			</form>
			</div>
		</div>
	</div>
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if showEdit && editingMeeting}
	<div class="dialog-backdrop" onclick={handleBackdropClick}>
		<div class="dialog meeting-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-meeting-title" onclick={e => e.stopPropagation()}>
		<div class="dialog-scroll">
			<div class="dialog-header">
				<h2 class="dialog-title" id="edit-meeting-title">Editar Reunión</h2>
				<button class="dialog-close" onclick={closeEdit} aria-label="Cerrar">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
				</button>
			</div>
			<form method="POST" action="?/updateMeeting" use:enhance={() => {
				updatingMeeting = true;
				return async ({ result, update }) => {
					updatingMeeting = false;
					if (result.type === 'success') {
						toast.success('Reunión actualizada.');
						closeEdit();
						await invalidateAll();
					} else {
						// @ts-ignore
						if (result.type === 'failure') toast.error(result.data?.error ?? 'No se pudo actualizar la reunión.');
						await update();
					}
				};
			}}>
				<input type="hidden" name="meeting_id" value={editingMeeting.id} />
				<div class="form-grid">
					<div class="form-group full-width">
						<label for="e-title" class="input-label">Título *</label>
						<input id="e-title" type="text" name="title" class="input" bind:value={editTitle} required />
					</div>
					<div class="form-group full-width">
						<label for="e-desc" class="input-label">Descripción / Temario</label>
						<textarea id="e-desc" name="description" class="input textarea" rows={3} bind:value={editDescription}></textarea>
					</div>
					<div class="form-group">
						<label for="e-date" class="input-label">Fecha y Hora *</label>
						<input id="e-date" type="datetime-local" name="date" class="input" bind:value={editDate} required />
					</div>
					<div class="form-group">
						<label for="e-duration" class="input-label">Duración (minutos)</label>
						<input id="e-duration" type="number" name="duration_min" class="input" min="15" max="480" step="15" bind:value={editDuration} />
					</div>
					<div class="form-group full-width">
						<label for="e-location" class="input-label">Lugar / Link</label>
						<input id="e-location" type="text" name="location" class="input" bind:value={editLocation} />
					</div>
				</div>
				<div class="dialog-actions">
					<button type="button" class="btn btn-ghost" onclick={closeEdit}>Cancelar</button>
					<button type="submit" class="btn btn-primary" disabled={updatingMeeting}>
						{#if updatingMeeting}<span class="spinner" style="width:16px;height:16px;margin-right:0.5rem;"></span>{/if}
						Guardar Cambios
					</button>
				</div>
			</form>
			</div>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={deleteMeetingOpen}
	title="Eliminar reunión"
	description="¿Eliminar esta reunión? Esta acción no se puede deshacer."
	onConfirm={confirmDeleteMeeting}
/>

<style>
	.page-header-content { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }

	.meetings-section { margin-bottom: 2rem; }
	.section-heading { font-size: 1rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 1rem; }

	.mt-btn { margin-top: 1rem; }

	.icon-btn {
		background: none; border: none; cursor: pointer;
		color: var(--text-muted); padding: 0.25rem;
		border-radius: var(--radius-sm);
		display: flex; align-items: center;
		transition: color var(--transition-fast), background var(--transition-fast);
	}
	.icon-btn:hover { color: var(--text-primary); background: var(--bg-overlay); }
	.icon-btn.text-success { color: var(--color-success); }
	.icon-btn.text-success:hover { background: color-mix(in srgb, var(--color-success) 10%, transparent); }
	.icon-btn.text-danger { color: var(--color-danger); }
	.icon-btn.text-danger:hover { background: color-mix(in srgb, var(--color-danger) 10%, transparent); }

	/* Modal */
	.meeting-dialog { max-width: 580px; }
	.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.5rem 1.5rem 0; }
	.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
	.full-width { grid-column: 1 / -1; }
	.textarea { resize: vertical; min-height: 80px; font-family: inherit; }

	/* Participants */
	.participants-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; max-height: 180px; overflow-y: auto; }
	.participant-chip {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
		background: var(--bg-surface); cursor: pointer; font-size: 0.8125rem;
		transition: border-color var(--transition-fast), background var(--transition-fast);
	}
	.participant-chip.selected { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
	.participant-avatar { width: 24px; height: 24px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: bold; flex-shrink: 0; }
	.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }

	/* Upcoming cards */
	.meetings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
	.meeting-card { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; min-width: 0; transition: box-shadow var(--transition-base), border-color var(--transition-base); }
	.meeting-card.upcoming { border-left: 3px solid var(--color-primary); }
	.meeting-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-default); }

	.meeting-card-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 0.75rem; }
	.meeting-date-badge { display: flex; flex-direction: column; align-items: center; background: color-mix(in srgb, var(--color-primary) 15%, transparent); border-radius: var(--radius-md); padding: 0.4rem 0.6rem; min-width: 44px; flex-shrink: 0; }
	.meeting-day { font-size: 1.25rem; font-weight: 800; color: var(--color-primary); line-height: 1; }
	.meeting-month { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
	.meeting-info { flex: 1; min-width: 0; }
	.meeting-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem; overflow-wrap: break-word; }
	.meeting-meta { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.75rem; color: var(--text-muted); }
	.meeting-meta span { display: flex; align-items: center; gap: 0.25rem; }
	.meeting-actions-top { display: flex; gap: 0.25rem; flex-shrink: 0; }
	.meeting-description { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.75rem; }

	.participants-row { display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; }
	.mini-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-highlight); border: 2px solid var(--bg-elevated); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); margin-left: -6px; }
	.mini-avatar:first-child { margin-left: 0; }
	.mini-avatar.more { background: var(--color-primary); color: var(--text-on-primary); font-size: 0.6rem; }
	.participants-count { font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem; }

	.card-footer-actions { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-subtle); }
	.btn-sm { height: 28px; padding: 0 0.625rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem; }
	.text-danger { color: var(--color-danger) !important; }
	.text-success { color: var(--color-success) !important; }

	/* History list */
	.meetings-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.meeting-row { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; transition: border-color var(--transition-fast); }
	.meeting-row.expanded { border-color: var(--color-primary); }
	.meeting-row-header { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.875rem 1rem; background: none; border: none; cursor: pointer; text-align: left; }
	.meeting-row-header:hover { background: var(--bg-overlay); }
	.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.meeting-row-info { flex: 1; }
	.meeting-row-title { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
	.meeting-row-meta { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem; }
	.meeting-row-participants { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--text-muted); }
	.meeting-row-body { padding: 1rem; border-top: 1px solid var(--border-subtle); background: var(--bg-surface); }

	/* Acta */
	.minutes-section { background: var(--bg-overlay); border-radius: var(--radius-md); padding: 0.875rem; }
	.minutes-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
	.minutes-display { cursor: pointer; padding: 0.5rem; border-radius: var(--radius-sm); transition: background var(--transition-fast); width: 100%; text-align: left; background: none; border: none; }
	.minutes-display:hover { background: var(--bg-highlight); }
	.edit-hint { display: block; font-size: 0.7rem; color: var(--text-muted); margin-top: 0.5rem; opacity: 0; transition: opacity var(--transition-fast); }
	.minutes-display:hover .edit-hint { opacity: 1; }

	.history-actions { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }

	/* Empty state */
	.empty-state-card { text-align: center; padding: 3rem 2rem; background: var(--bg-elevated); border: 1px dashed var(--border-default); border-radius: var(--radius-lg); color: var(--text-muted); }

	@media (max-width: 640px) {
		.form-grid { grid-template-columns: 1fr; }
		.meetings-grid { grid-template-columns: 1fr; }
	}
</style>
