<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import EventDialog from '$lib/components/calendar/EventDialog.svelte';
	import EventDetailModal from '$lib/components/calendar/EventDetailModal.svelte';

	let { data }: { data: PageData } = $props();

	let calendarEl: HTMLDivElement;
	let calendarInstance = $state<any>(null);
	let showEventDialog = $state(false);
	let showDetailModal = $state(false);
	let selectedEvent = $state<Record<string, any> | null>(null);
	let editingEvent = $state<Record<string, any> | null>(null);
	let selectedDateRange = $state<{start: string, end: string, allDay: boolean} | null>(null);
	let showTeacher = $state(false);
	
	$effect(() => {
		if (data.preferences?.show_teacher_events !== undefined && !showTeacher) {
			showTeacher = data.preferences.show_teacher_events;
		}
	});
	let togglingTeacher = $state(false);
	let currentView = $state('timeGridWeek');

	$effect(() => {
		console.log('Events from DB:', data.events);
	});

	const isDirector = $derived(data.profile?.role === 'director' || data.profile?.role === 'admin' || data.profile?.role === 'superadmin');

	// Map DB events → FullCalendar event format
	function mapToFCEvents(events: typeof data.events) {
		return events.map((e) => {
			// Remover la información de zona horaria (Z o +00:00) para forzar a FullCalendar a tratarlo como Hora Local
			let start = e.starts_at ? e.starts_at.replace(/(Z|[+-]\d{2}:\d{2})$/, '') : e.starts_at;
			let end = e.ends_at ? e.ends_at.replace(/(Z|[+-]\d{2}:\d{2})$/, '') : e.ends_at;

			if (e.all_day) {
				start = start.split('T')[0];
				if (end) {
					end = end.split('T')[0];
					// Si es el mismo día, lo omitimos para que FullCalendar asuma 1 día por defecto.
					if (start === end) {
						end = undefined;
					} else {
						// FullCalendar asume que el 'end' es EXCLUSIVO. 
						// Si el usuario eligió que termina el 3 de julio, debemos pasar 4 de julio.
						const d = new Date(end);
						d.setUTCDate(d.getUTCDate() + 1);
						end = d.toISOString().split('T')[0];
					}
				}
			}

			return {
				id: e.id,
				title: e.title,
				start: start,
				end: end,
				allDay: e.all_day,
				backgroundColor: (e as any).event_categories?.color ?? '#6366f1',
				borderColor: (e as any).event_categories?.color ?? '#6366f1',
				extendedProps: { ...e }
			};
		});
	}

	onMount(async () => {
		// Dynamic import to avoid SSR issues
		const [{ Calendar }, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin] = await Promise.all([
			import('@fullcalendar/core'),
			import('@fullcalendar/daygrid'),
			import('@fullcalendar/timegrid'),
			import('@fullcalendar/list'),
			import('@fullcalendar/interaction')
		]);

		calendarInstance = new Calendar(calendarEl, {
			plugins: [dayGridPlugin.default, timeGridPlugin.default, listPlugin.default, interactionPlugin.default],
			initialView: 'dayGridMonth',
			locale: 'es',
			firstDay: 1, // Monday
			height: 'auto',
			headerToolbar: {
				left: 'prev,next today',
				center: 'title',
				right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
			},
			buttonText: {
				today: 'Hoy',
				month: 'Mes',
				week: 'Semana',
				day: 'Día',
				list: 'Lista'
			},
			eventDisplay: 'list-item', // Fuerza a que TODOS los eventos (incluso allDay) se vean como puntito
			events: mapToFCEvents(data.events),
			selectable: true,
			selectMirror: true,
			editable: false, // drag-to-edit off for now
			eventClick: (info: any) => {
				selectedEvent = { ...info.event.extendedProps, id: info.event.id };
				showDetailModal = true;
			},
			select: (info: any) => {
				// Open create dialog pre-filled with selected date
				editingEvent = null;
				selectedDateRange = {
					start: info.startStr,
					end: info.endStr,
					allDay: info.allDay
				};
				showEventDialog = true;
			},
			noEventsContent: 'No hay eventos este período'
		});

		calendarInstance.render();
		return () => calendarInstance?.destroy();
	});

	// Reactively update calendar when events change
	$effect(() => {
		const events = data.events;
		if (calendarInstance) {
			calendarInstance.removeAllEvents();
			calendarInstance.addEventSource(mapToFCEvents(events));
		}
	});

	async function handleToggleTeacher(value: boolean) {
		showTeacher = value;
		togglingTeacher = true;

		const fd = new FormData();
		fd.append('show_teacher_events', value.toString());
		await fetch('?/toggleTeacherEvents', { method: 'POST', body: fd });
		await invalidateAll();
		togglingTeacher = false;
	}

	function openCreateDialog() {
		editingEvent = null;
		showEventDialog = true;
	}

	function openEditDialog(event: Record<string, any>) {
		editingEvent = event;
		showEventDialog = true;
	}
</script>

<svelte:head>
	<title>Calendario — Agenda Educativa</title>
	<meta name="description" content="Calendario escolar con eventos y reuniones por rol" />
</svelte:head>

<!-- FullCalendar CSS (loaded dynamically) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.15/main.min.css" />

<div class="page-header">
	<div class="page-header-content">
		<div>
			<h1 class="page-title">Calendario</h1>
			<p class="page-subtitle">
				{data.profile?.role === 'director' ? 'Gestión de eventos institucionales' : 'Tus eventos y actividades'}
			</p>
		</div>
		<div class="header-actions">
			<!-- Director toggle -->
			{#if isDirector}
				<div class="teacher-toggle-wrapper" class:loading={togglingTeacher}>
					<label class="toggle-wrapper" for="toggle-teacher">
						<div class="toggle" id="toggle-teacher">
							<input
								type="checkbox"
								checked={showTeacher}
								onchange={(e) => handleToggleTeacher((e.target as HTMLInputElement).checked)}
								disabled={togglingTeacher}
							/>
							<div class="toggle-track"></div>
							<div class="toggle-thumb"></div>
						</div>
						<span class="toggle-label-text">
							{#if togglingTeacher}
								<span class="spinner" style="width:14px;height:14px"></span>
							{/if}
							Ver actividades de docentes
						</span>
					</label>
				</div>
			{/if}

			<button class="btn btn-primary" onclick={openCreateDialog} id="btn-new-event">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
					<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				Nuevo Evento
			</button>
		</div>
	</div>
</div>

<div class="page-body">
	<!-- Legend -->
	{#if isDirector && showTeacher}
		<div class="calendar-legend">
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--role-director)"></span>
				Tus eventos
			</span>
			<span class="legend-item">
				<span class="legend-dot" style="background: var(--role-teacher)"></span>
				Eventos de docentes
			</span>
		</div>
	{/if}

	<!-- Calendar -->
	<div class="calendar-wrapper card">
		<div bind:this={calendarEl}></div>
	</div>
</div>

<!-- Dialogs -->
<EventDialog
	bind:open={showEventDialog}
	event={editingEvent}
	categories={data.categories}
	groups={data.groups}
	userRole={data.profile?.role ?? 'teacher'}
	schoolId={data.profile?.school_id ?? ''}
	initialDateRange={selectedDateRange}
	onclose={() => { editingEvent = null; selectedDateRange = null; }}
/>

<EventDetailModal
	bind:open={showDetailModal}
	event={selectedEvent}
	currentUserId={data.user?.id ?? ''}
	onEdit={openEditDialog}
	onClose={() => { selectedEvent = null; }}
/>

<style>
	.page-header-content {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.teacher-toggle-wrapper {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.875rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		transition: opacity var(--transition-fast);
	}
	.teacher-toggle-wrapper.loading { opacity: 0.7; }
	.toggle-label-text {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.calendar-legend {
		display: flex;
		gap: 1.25rem;
		margin-bottom: 1rem;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}
	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.calendar-wrapper {
		padding: 1.25rem;
	}
</style>
