<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { Calendar, Users, MapPin, Clock, Plus, X, FileText, CheckCircle2, XCircle } from 'lucide-svelte';
	
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Dialog from "$lib/components/ui/dialog";

	let { data }: { data: PageData } = $props();

	let showCreate = $state(false);
	let creating = $state(false);
	let expandedMeeting = $state<string | null>(null);
	let editingMinutes = $state<string | null>(null);
	let savingMinutes = $state(false);

	// Form fields
	let title = $state('');
	let description = $state('');
	let date = $state('');
	let duration = $state(60);
	let location = $state('');
	let selectedParticipants = $state<string[]>([]);

	function resetForm() {
		title = '';
		description = '';
		date = '';
		duration = 60;
		location = '';
		selectedParticipants = [];
		showCreate = false;
	}

	function toggleParticipant(id: string) {
		if (selectedParticipants.includes(id)) {
			selectedParticipants = selectedParticipants.filter(p => p !== id);
		} else {
			selectedParticipants = [...selectedParticipants, id];
		}
	}

	function formatDate(dt: string) {
		const d = new Date(dt);
		return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}

	function formatTime(dt: string) {
		const d = new Date(dt);
		return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
	}

	function statusLabel(s: string) {
		return { scheduled: 'Programada', completed: 'Completada', cancelled: 'Cancelada' }[s] ?? s;
	}
	function statusColor(s: string) {
		return { scheduled: '#6366f1', completed: '#10b981', cancelled: '#ef4444' }[s] ?? '#94a3b8';
	}

	// Calcular si es futura o pasada
	function isPast(dt: string) {
		return new Date(dt) < new Date();
	}

	// Upcoming / Past split
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
		<Dialog.Root bind:open={showCreate}>
			<Dialog.Trigger>
				<Button id="btn-new-meeting">
					<Plus size="16" class="mr-2" /> Nueva Reunión
				</Button>
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-[620px]">
				<Dialog.Header>
					<Dialog.Title class="flex items-center gap-2"><Calendar size="20" /> Nueva Reunión</Dialog.Title>
				</Dialog.Header>

				<form method="POST" action="?/createMeeting" use:enhance={() => {
					creating = true;
					return async ({ result, update }) => {
						creating = false;
						if (result.type === 'success') {
							resetForm();
							await invalidateAll();
						} else {
							await update();
						}
					};
				}}>
					<div class="form-grid mt-4">
						<div class="form-group full-width">
							<label class="input-label">Título *</label>
							<Input type="text" name="title" placeholder="Ej: Reunión de coordinación docente" bind:value={title} required />
						</div>

						<div class="form-group full-width">
							<label class="input-label">Descripción / Temario</label>
							<Textarea name="description" rows={3} placeholder="Puntos a tratar..." bind:value={description}></Textarea>
						</div>

						<div class="form-group">
							<label class="input-label">Fecha y Hora *</label>
							<Input type="datetime-local" name="date" bind:value={date} required />
						</div>

						<div class="form-group">
							<label class="input-label">Duración (minutos)</label>
							<Input type="number" name="duration_min" min="15" max="480" step="15" bind:value={duration} />
						</div>

						<div class="form-group full-width">
							<label class="input-label">Lugar / Link</label>
							<Input type="text" name="location" placeholder="Ej: Sala de reuniones / meet.google.com/xxx" bind:value={location} />
						</div>

						<!-- Participants -->
						<div class="form-group full-width">
							<label class="input-label"><Users size="14" /> Convocar participantes</label>
							<div class="participants-grid">
								{#each data.staff as member}
									<label class="participant-chip" class:selected={selectedParticipants.includes(member.id)}>
										<input type="hidden" name="participants" value={member.id} disabled={!selectedParticipants.includes(member.id)} />
										<Checkbox
											id="participant-{member.id}"
											checked={selectedParticipants.includes(member.id)}
											onCheckedChange={() => toggleParticipant(member.id)}
											class="hidden"
										/>
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
									<p style="font-size:0.85rem;color:var(--text-muted);font-style:italic;">No hay personal en la escuela.</p>
								{/if}
							</div>
						</div>
					</div>

					<div class="modal-actions">
						<Button type="button" variant="ghost" onclick={() => resetForm()}>Cancelar</Button>
						<Button type="submit" disabled={creating}>
							{#if creating}<span class="spinner" style="width:16px;height:16px;margin-right:0.5rem;"></span>{/if}
							Crear Reunión
						</Button>
					</div>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>

<div class="page-body">

	<!-- ── Próximas ─────────────────────────────────────── -->
	<section class="meetings-section">
		<h2 class="section-heading">Próximas ({upcomingMeetings.length})</h2>

		{#if upcomingMeetings.length === 0}
			<div class="empty-state-card">
				<Calendar size="36" style="color: var(--text-muted); margin-bottom: 0.5rem;" />
				<p>No hay reuniones programadas.</p>
				<Button class="mt-4" onclick={() => (showCreate = true)}>
					<Plus size="14" class="mr-2" /> Crear primera reunión
				</Button>
			</div>
		{:else}
			<div class="meetings-grid">
				{#each upcomingMeetings as meeting (meeting.id)}
					<div class="meeting-card upcoming">
						<div class="meeting-card-header">
							<div class="meeting-date-badge">
								<span class="meeting-day">{new Date(meeting.date).getDate()}</span>
								<span class="meeting-month">{new Date(meeting.date).toLocaleDateString('es-AR', { month: 'short' }).replace('.','')}</span>
							</div>
							<div class="meeting-info">
								<h3 class="meeting-title">{meeting.title}</h3>
								<div class="meeting-meta">
									<span><Clock size="12" /> {formatTime(meeting.date)} · {meeting.duration_min} min</span>
									{#if meeting.location}
										<span><MapPin size="12" /> {meeting.location}</span>
									{/if}
								</div>
							</div>
							<div class="meeting-actions-top">
								<!-- Completar -->
								<form method="POST" action="?/updateStatus" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') await invalidateAll();
										else await update();
									};
								}}>
									<input type="hidden" name="meeting_id" value={meeting.id} />
									<input type="hidden" name="status" value="completed" />
									<button type="submit" class="icon-btn text-success" title="Marcar como completada">
										<CheckCircle2 size="16" />
									</button>
								</form>
								<!-- Cancelar -->
								<form method="POST" action="?/updateStatus" use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') await invalidateAll();
										else await update();
									};
								}}>
									<input type="hidden" name="meeting_id" value={meeting.id} />
									<input type="hidden" name="status" value="cancelled" />
									<button type="submit" class="icon-btn text-danger" title="Cancelar reunión">
										<XCircle size="16" />
									</button>
								</form>
							</div>
						</div>

						{#if meeting.description}
							<p class="meeting-description">{meeting.description}</p>
						{/if}

						<!-- Participants -->
						<div class="participants-row">
							{#each (meeting.meeting_participants ?? []).slice(0, 6) as p}
								<div class="mini-avatar" title={p.profiles?.full_name ?? ''}>
									{(p.profiles?.full_name ?? 'U')[0].toUpperCase()}
								</div>
							{/each}
							{#if (meeting.meeting_participants ?? []).length > 6}
								<div class="mini-avatar more">+{(meeting.meeting_participants ?? []).length - 6}</div>
							{/if}
							<span class="participants-count">{(meeting.meeting_participants ?? []).length} convocados</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- ── Historial ─────────────────────────────────────── -->
	{#if pastMeetings.length > 0}
		<section class="meetings-section">
			<h2 class="section-heading">Historial ({pastMeetings.length})</h2>
			<div class="meetings-list">
				{#each pastMeetings as meeting (meeting.id)}
					<div class="meeting-row" class:expanded={expandedMeeting === meeting.id}>
						<button
							class="meeting-row-header"
							onclick={() => expandedMeeting = expandedMeeting === meeting.id ? null : meeting.id}
						>
							<span class="status-dot" style="background: {statusColor(meeting.status)}"></span>
							<div class="meeting-row-info">
								<span class="meeting-row-title">{meeting.title}</span>
								<span class="meeting-row-meta">
									{formatDate(meeting.date)} · {formatTime(meeting.date)}
									{#if meeting.location} · {meeting.location}{/if}
								</span>
							</div>
							<span class="badge" style="background:{statusColor(meeting.status)}20;color:{statusColor(meeting.status)};border:1px solid {statusColor(meeting.status)}40;">
								{statusLabel(meeting.status)}
							</span>
							<span class="meeting-row-participants">
								<Users size="13" /> {(meeting.meeting_participants ?? []).length}
							</span>
						</button>

						{#if expandedMeeting === meeting.id}
							<div class="meeting-row-body">
								{#if meeting.description}
									<p class="meeting-description" style="margin-bottom:1rem;">{meeting.description}</p>
								{/if}

								<!-- Acta -->
								<div class="minutes-section">
									<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
										<FileText size="14" style="color:var(--color-primary)" />
										<span style="font-size:0.8rem;font-weight:600;color:var(--text-secondary);">Acta de la reunión</span>
									</div>

									{#if editingMinutes === meeting.id}
										<form method="POST" action="?/updateMinutes" use:enhance={() => {
											savingMinutes = true;
											return async ({ result, update }) => {
												savingMinutes = false;
												if (result.type === 'success') {
													editingMinutes = null;
													await invalidateAll();
												} else await update();
											};
										}}>
											<input type="hidden" name="meeting_id" value={meeting.id} />
											<Textarea
												name="minutes"
												rows={6}
												placeholder="Escribí los puntos tratados, acuerdos y decisiones de la reunión..."
												value={meeting.minutes ?? ''}
											></Textarea>
											<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
												<Button type="submit" disabled={savingMinutes} class="h-8 px-3 text-xs">
													{#if savingMinutes}<span class="spinner" style="width:12px;height:12px;margin-right:0.25rem;"></span>{/if}
													Guardar Acta
												</Button>
												<Button type="button" variant="ghost" class="h-8 px-3 text-xs" onclick={() => editingMinutes = null}>
													Cancelar
												</Button>
											</div>
										</form>
									{:else}
										<div class="minutes-display" onclick={() => editingMinutes = meeting.id}>
											{#if meeting.minutes}
												<p style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-secondary);line-height:1.6;">{meeting.minutes}</p>
											{:else}
												<p style="font-size:0.85rem;color:var(--text-muted);font-style:italic;">Sin acta registrada. Hacé clic para agregar.</p>
											{/if}
											<span class="edit-hint">Clic para editar</span>
										</div>
									{/if}
								</div>

								<!-- Participants -->
								<div class="participants-row" style="margin-top:1rem;">
									{#each (meeting.meeting_participants ?? []) as p}
										<div class="mini-avatar" title={p.profiles?.full_name ?? ''}>{(p.profiles?.full_name ?? 'U')[0].toUpperCase()}</div>
									{/each}
									<span class="participants-count">{(meeting.meeting_participants ?? []).length} participantes</span>
								</div>

								<!-- Acciones de historial -->
								<div style="display:flex;gap:0.5rem;margin-top:1rem;">
									{#if meeting.status !== 'completed'}
										<form method="POST" action="?/updateStatus" use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') await invalidateAll();
												else await update();
											};
										}}>
											<input type="hidden" name="meeting_id" value={meeting.id} />
											<input type="hidden" name="status" value="completed" />
											<Button type="submit" variant="ghost" class="h-8 px-3 text-xs text-success">
												<CheckCircle2 size="13" class="mr-1" /> Marcar completada
											</Button>
										</form>
									{/if}
									<form method="POST" action="?/deleteMeeting" use:enhance={(e) => {
										if (!confirm('¿Eliminar esta reunión? No se puede deshacer.')) { e.cancel(); return; }
										return async ({ result, update }) => {
											if (result.type === 'success') { expandedMeeting = null; await invalidateAll(); }
											else await update();
										};
									}}>
										<input type="hidden" name="meeting_id" value={meeting.id} />
										<Button type="submit" variant="ghost" class="h-8 px-3 text-xs text-destructive">
											<X size="13" class="mr-1" /> Eliminar
										</Button>
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

<style>
	/* ── Layout ── */
	.meetings-section { margin-bottom: 2rem; }
	.section-heading {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* ── Modal ── */
	.modal-overlay {
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.65);
		backdrop-filter: blur(4px);
		display: flex; align-items: center; justify-content: center;
		z-index: 100;
		padding: 1rem;
	}
	.modal-card {
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
		width: 100%; max-width: 620px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: var(--shadow-lg);
	}
	.modal-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 1.25rem 1.5rem 0;
		margin-bottom: 1.25rem;
	}
	.modal-title {
		display: flex; align-items: center; gap: 0.5rem;
		font-size: 1.125rem; font-weight: 700; color: var(--text-primary);
		margin: 0;
	}
	.icon-btn {
		background: none; border: none; cursor: pointer;
		color: var(--text-muted); padding: 0.25rem;
		border-radius: var(--radius-sm);
		display: flex; align-items: center;
		transition: color var(--transition-fast), background var(--transition-fast);
	}
	.icon-btn:hover { color: var(--text-primary); background: var(--bg-overlay); }
	.icon-btn.text-success { color: var(--color-success); }
	.icon-btn.text-success:hover { background: rgba(16,185,129,0.1); }
	.icon-btn.text-danger { color: var(--color-danger); }
	.icon-btn.text-danger:hover { background: rgba(239,68,68,0.1); }

	/* ── Form ── */
	.form-grid {
		display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
		padding: 0 1.5rem;
	}
	.form-group { display: flex; flex-direction: column; gap: 0.35rem; }
	.full-width { grid-column: 1 / -1; }
	.modal-actions {
		display: flex; justify-content: flex-end; gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		margin-top: 1.25rem;
	}

	/* ── Participants picker ── */
	.participants-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.5rem; max-height: 180px; overflow-y: auto;
	}
	.participant-chip {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		cursor: pointer;
		font-size: 0.8125rem;
		transition: border-color var(--transition-fast), background var(--transition-fast);
	}
	.participant-chip.selected {
		border-color: var(--color-primary);
		background: rgba(99,102,241,0.1);
	}
	.participant-avatar {
		width: 24px; height: 24px;
		border-radius: 50%; color: white;
		display: flex; align-items: center; justify-content: center;
		font-size: 0.65rem; font-weight: bold; flex-shrink: 0;
	}

	/* ── Meeting cards (upcoming) ── */
	.meetings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
	}
	.meeting-card {
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		transition: box-shadow var(--transition-base), border-color var(--transition-base);
	}
	.meeting-card.upcoming {
		border-left: 3px solid var(--color-primary);
	}
	.meeting-card:hover { box-shadow: var(--shadow-md); border-color: var(--border-default); }

	.meeting-card-header {
		display: flex; align-items: flex-start; gap: 1rem;
		margin-bottom: 0.75rem;
	}
	.meeting-date-badge {
		display: flex; flex-direction: column; align-items: center;
		background: rgba(99,102,241,0.15);
		border-radius: var(--radius-md);
		padding: 0.4rem 0.6rem;
		min-width: 44px; flex-shrink: 0;
	}
	.meeting-day { font-size: 1.25rem; font-weight: 800; color: var(--color-primary); line-height: 1; }
	.meeting-month { font-size: 0.65rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }

	.meeting-info { flex: 1; }
	.meeting-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.25rem; }
	.meeting-meta { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.75rem; color: var(--text-muted); }
	.meeting-meta span { display: flex; align-items: center; gap: 0.25rem; }

	.meeting-actions-top { display: flex; gap: 0.25rem; flex-shrink: 0; }

	.meeting-description {
		font-size: 0.8125rem; color: var(--text-secondary);
		line-height: 1.5; margin-bottom: 0.75rem;
	}

	/* ── Participants row ── */
	.participants-row {
		display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap;
	}
	.mini-avatar {
		width: 28px; height: 28px; border-radius: 50%;
		background: var(--bg-highlight);
		border: 2px solid var(--bg-elevated);
		display: flex; align-items: center; justify-content: center;
		font-size: 0.65rem; font-weight: 700; color: var(--text-secondary);
		margin-left: -6px;
	}
	.mini-avatar:first-child { margin-left: 0; }
	.mini-avatar.more { background: var(--color-primary); color: white; font-size: 0.6rem; }
	.participants-count { font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem; }

	/* ── Meeting list (historial) ── */
	.meetings-list { display: flex; flex-direction: column; gap: 0.5rem; }
	.meeting-row {
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: border-color var(--transition-fast);
	}
	.meeting-row.expanded { border-color: var(--color-primary); }

	.meeting-row-header {
		display: flex; align-items: center; gap: 0.75rem;
		width: 100%; padding: 0.875rem 1rem;
		background: none; border: none; cursor: pointer; text-align: left;
	}
	.meeting-row-header:hover { background: var(--bg-overlay); }
	.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.meeting-row-info { flex: 1; }
	.meeting-row-title { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
	.meeting-row-meta { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem; }
	.meeting-row-participants { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--text-muted); }

	.meeting-row-body {
		padding: 1rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-surface);
	}

	/* ── Acta ── */
	.minutes-section { background: var(--bg-overlay); border-radius: var(--radius-md); padding: 0.875rem; }
	.minutes-textarea { width: 100%; resize: vertical; font-family: inherit; }
	.minutes-display {
		cursor: pointer; position: relative;
		padding: 0.5rem;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}
	.minutes-display:hover { background: var(--bg-highlight); }
	.edit-hint {
		display: block; font-size: 0.7rem; color: var(--text-muted);
		margin-top: 0.5rem; opacity: 0;
		transition: opacity var(--transition-fast);
	}
	.minutes-display:hover .edit-hint { opacity: 1; }

	/* ── Empty state ── */
	.empty-state-card {
		text-align: center; padding: 3rem 2rem;
		background: var(--bg-elevated);
		border: 1px dashed var(--border-default);
		border-radius: var(--radius-lg);
		color: var(--text-muted);
	}

	.text-success { color: var(--color-success) !important; }
	.text-danger { color: var(--color-danger) !important; }

	@media (max-width: 640px) {
		.form-grid { grid-template-columns: 1fr; }
		.meetings-grid { grid-template-columns: 1fr; }
	}
</style>
