<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { AlertCircle } from 'lucide-svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	let {
		open = $bindable(false),
		event = null,
		categories = [],
		groups = [],
		courses = [],
		userRole = 'teacher',
		schoolId = '',
		initialDateRange = null,
		onclose
	}: {
		open: boolean;
		event?: Record<string, any> | null;
		categories: Array<{ id: string; name: string; color: string; icon: string }>;
		groups?: Array<{ id: string; name: string }>;
		courses?: Array<{ id: string; name: string }>;
		userRole: string;
		schoolId: string;
		initialDateRange?: { start: string; end: string; allDay: boolean } | null;
		onclose?: () => void;
	} = $props();

	let loading = $state(false);
	let formError = $state('');

	const isEditing = $derived(!!event?.id);
	const actionUrl = $derived(isEditing ? '?/updateEvent' : '?/createEvent');

	// Default form state
	let title = $state('');
	let description = $state('');
	let startsAt = $state('');
	let endsAt = $state('');
	let allDay = $state(false);
	let location = $state('');
	let categoryId = $state('');
	let visibility = $state('private');
	let groupId = $state('');
	let courseId = $state('');

	let showNewCat = $state(false);
	let newCatName = $state('');
	let newCatColor = $state('#0a3055');
	let creatingCat = $state(false);

	function formatDatetimeLocal(dateStr: string, defaultTime: string) {
		if (!dateStr) return '';
		if (dateStr.length === 10) return `${dateStr}T${defaultTime}`;
		return dateStr.slice(0, 16);
	}

	let prevOpen = $state(false);

	// Populate form when editing or opening
	$effect(() => {
		if (open && !prevOpen) {
			untrack(() => {
				if (event) {
					title = event.title ?? '';
					description = event.description ?? '';
					allDay = event.all_day ?? false;
					startsAt = event.starts_at ? (allDay ? event.starts_at.slice(0, 10) : event.starts_at.slice(0, 16)) : '';
					endsAt = event.ends_at ? (allDay ? event.ends_at.slice(0, 10) : event.ends_at.slice(0, 16)) : '';
					location = event.location ?? '';
					categoryId = event.category_id ?? '';
					visibility = event.visibility ?? 'private';
					groupId = event.group_id ?? '';
					courseId = event.course_id ?? '';
				} else {
					title = '';
					description = '';
					allDay = initialDateRange?.allDay ?? false;
					
					if (allDay) {
						startsAt = initialDateRange?.start ? initialDateRange.start.slice(0, 10) : '';
						if (initialDateRange?.end && initialDateRange.end.length === 10) {
							const startD = new Date(initialDateRange.start);
							const endD = new Date(initialDateRange.end);
							if (endD.getTime() - startD.getTime() === 86400000) {
								endsAt = initialDateRange.start.slice(0, 10);
							} else {
								endD.setDate(endD.getDate() - 1);
								endsAt = endD.toISOString().slice(0, 10);
							}
						} else {
							endsAt = initialDateRange?.end ? initialDateRange.end.slice(0, 10) : '';
						}
					} else {
						startsAt = initialDateRange?.start ? formatDatetimeLocal(initialDateRange.start, '08:00') : '';
						if (initialDateRange?.end) {
							if (initialDateRange.end.length === 10) {
								endsAt = formatDatetimeLocal(initialDateRange.start, '09:00');
							} else {
								endsAt = formatDatetimeLocal(initialDateRange.end, '09:00');
							}
						} else {
							endsAt = '';
						}
					}

					location = '';
					categoryId = '';
					visibility = 'private';
					groupId = '';
					courseId = '';
				}
				formError = '';
			});
		}
		prevOpen = open;
	});

	function handleAllDayToggle() {
		if (allDay) {
			if (startsAt.length > 10) startsAt = startsAt.slice(0, 10);
			if (endsAt.length > 10) endsAt = endsAt.slice(0, 10);
		} else {
			if (startsAt && startsAt.length === 10) startsAt = `${startsAt}T08:00`;
			if (endsAt && endsAt.length === 10) endsAt = `${endsAt}T09:00`;
		}
	}

	function close() {
		open = false;
		onclose?.();
	}

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('dialog-backdrop')) close();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="dialog-backdrop" onclick={handleBackdropClick}>
		<div class="dialog event-dialog" role="dialog" aria-modal="true" aria-labelledby="event-dialog-title">
			<div class="dialog-header">
				<h2 class="dialog-title" id="event-dialog-title">
					{isEditing ? 'Editar Evento' : 'Nuevo Evento'}
				</h2>
				<button class="dialog-close" onclick={close} aria-label="Cerrar">
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

			<form
				method="POST"
				action={actionUrl}
				use:enhance={() => {
					loading = true;
					formError = '';
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'success') {
							await invalidateAll();
							close();
						} else if (result.type === 'failure') {
							formError = (result.data?.error as string) ?? 'Error al guardar el evento.';
						} else {
							await update();
						}
					};
				}}
			>
				{#if isEditing}
					<input type="hidden" name="id" value={event?.id} />
				{/if}

				<!-- Title -->
				<div class="form-group">
					<label class="input-label" for="event-title">
						Título <span class="required">*</span>
					</label>
					<input
						id="event-title"
						name="title"
						type="text"
						class="input"
						placeholder="Ej: Reunión de padres, Capacitación docente..."
						bind:value={title}
						required
						maxlength="150"
					/>
				</div>

				<!-- Category -->
				<div class="form-group">
					<label class="input-label" for="event-category">Categoría</label>
					<div class="category-grid">
						{#each categories as cat}
							<label class="category-option" class:selected={categoryId === cat.id}>
								<input type="radio" name="category_id" value={cat.id} bind:group={categoryId} hidden />
								<span class="cat-dot" style="background: {cat.color}"></span>
								<span class="cat-name">{cat.name}</span>
							</label>
						{/each}
						<button type="button" class="category-option" onclick={() => (showNewCat = true)} disabled={showNewCat}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
							</svg>
							Nueva
						</button>
					</div>

					{#if showNewCat}
						<div class="new-category-form" style="display:flex;gap:0.5rem;margin-top:0.5rem;">
							<input type="text" class="input" placeholder="Nombre" bind:value={newCatName} style="flex:1" />
							<input type="color" bind:value={newCatColor} style="width:40px;height:40px;padding:0;border-radius:4px;" />
							<button type="button" class="btn btn-primary" style="padding:0 0.75rem;" disabled={creatingCat} onclick={async () => {
								if (!newCatName) return;
								creatingCat = true;
								const fd = new FormData();
								fd.append('name', newCatName);
								fd.append('color', newCatColor);
								const res = await fetch('?/createCategory', { method: 'POST', body: fd });
								const json = await res.json();
								const data = JSON.parse(json.data);
								if (data[1] === 'success') {
									categories = [...categories, data[2].category];
									categoryId = data[2].category.id;
									showNewCat = false;
									newCatName = '';
								} else {
									formError = 'Error creando categoría';
								}
								creatingCat = false;
							}}>
								{creatingCat ? '...' : 'OK'}
							</button>
							<button type="button" class="btn btn-ghost" style="padding:0 0.5rem;" onclick={() => (showNewCat = false)}>✕</button>
						</div>
					{/if}

					<!-- Hidden fallback if no category selected -->
					{#if !categoryId}
						<input type="hidden" name="category_id" value="" />
					{/if}
				</div>

				<!-- Dates -->
				<div class="form-row">
					<div class="form-group">
						<label class="input-label" for="event-start">
							Inicio <span class="required">*</span>
						</label>
						<input
							id="event-start"
							name="starts_at"
							type={allDay ? 'date' : 'datetime-local'}
							class="input"
							bind:value={startsAt}
							required
						/>
					</div>
					<div class="form-group">
						<label class="input-label" for="event-end">Fin</label>
						<input
							id="event-end"
							name="ends_at"
							type={allDay ? 'date' : 'datetime-local'}
							class="input"
							bind:value={endsAt}
							min={startsAt}
						/>
					</div>
				</div>

				<!-- All day toggle -->
				<div class="form-group">
					<label class="toggle-wrapper">
						<div class="toggle">
							<input type="checkbox" name="all_day" bind:checked={allDay} onchange={handleAllDayToggle} />
							<div class="toggle-track"></div>
							<div class="toggle-thumb"></div>
						</div>
						<span class="toggle-label">Todo el día</span>
					</label>
				</div>

				<!-- Location -->
				<div class="form-group">
					<label class="input-label" for="event-location">Ubicación</label>
					<input
						id="event-location"
						name="location"
						type="text"
						class="input"
						placeholder="Aula 3, Sala de reuniones, Virtual..."
						bind:value={location}
					/>
				</div>

				<!-- Description -->
				<div class="form-group">
					<label class="input-label" for="event-desc">Descripción</label>
					<textarea
						id="event-desc"
						name="description"
						class="input textarea"
						placeholder="Detalles del evento..."
						bind:value={description}
						rows="3"
					></textarea>
				</div>

				<!-- Visibility -->
				{#if userRole === 'director' || userRole === 'admin' || userRole === 'superadmin'}
					<div class="form-row">
						<div class="form-group">
							<label class="input-label" for="event-visibility">Visibilidad</label>
							<select id="event-visibility" name="visibility" class="input" bind:value={visibility}>
								<option value="private">Solo yo</option>
								<option value="school">Toda la institución</option>
								{#if groups && groups.length > 0}
									<option value="group">Grupo de Staff</option>
								{/if}
								{#if courses && courses.length > 0}
									<option value="course">Curso de alumnos</option>
								{/if}
							</select>
						</div>
						{#if visibility === 'group'}
							<div class="form-group">
								<label class="input-label" for="event-group">Seleccionar Grupo</label>
								<select id="event-group" name="group_id" class="input" bind:value={groupId} required>
									<option value="">Seleccionar...</option>
									{#each groups as g}
										<option value={g.id}>{g.name}</option>
									{/each}
								</select>
							</div>
						{/if}
						{#if visibility === 'course'}
							<div class="form-group">
								<label class="input-label" for="event-course">Seleccionar Curso</label>
								<select id="event-course" name="course_id" class="input" bind:value={courseId} required>
									<option value="">Seleccionar...</option>
									{#each courses as c}
										<option value={c.id}>{c.name}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>
					{#if (!groups || groups.length === 0) && (!courses || courses.length === 0)}
						<p class="hint-text">
							💡 Para usar visibilidad por grupo o curso, primero creá grupos en la sección
							<a href="/staff" class="link-inline">Staff</a> o cursos en
							<a href="/alumnos" class="link-inline">Alumnos y Tutores</a>.
						</p>
					{/if}
				{:else if userRole === 'teacher'}
					<div class="form-row">
						<div class="form-group">
							<label class="input-label" for="event-visibility">Visibilidad</label>
							<select id="event-visibility" name="visibility" class="input" bind:value={visibility}>
								<option value="private">Solo yo</option>
								{#if courses && courses.length > 0}
									<option value="course">Curso de alumnos</option>
								{/if}
							</select>
						</div>
						{#if visibility === 'course'}
							<div class="form-group">
								<label class="input-label" for="event-course">Seleccionar Curso</label>
								<select id="event-course" name="course_id" class="input" bind:value={courseId} required>
									<option value="">Seleccionar...</option>
									{#each courses as c}
										<option value={c.id}>{c.name}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>
					{#if !courses || courses.length === 0}
						<p class="hint-text">
							💡 Para notificar a un curso de alumnos, pedile a un director que cree uno en
							<a href="/alumnos" class="link-inline">Alumnos y Tutores</a>.
						</p>
					{/if}
				{:else}
					<input type="hidden" name="visibility" value="private" />
				{/if}

				<!-- Actions -->
				<div class="dialog-actions">
					<button type="button" class="btn btn-ghost" onclick={close}>
						Cancelar
					</button>
					<button type="submit" class="btn btn-primary" disabled={loading} id={isEditing ? 'btn-update-event' : 'btn-create-event'}>
						{#if loading}
							<span class="spinner"></span>
							Guardando...
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								{#if isEditing}
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
								{:else}
									<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
								{/if}
							</svg>
							{isEditing ? 'Actualizar' : 'Crear Evento'}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.event-dialog { max-width: 560px; }

	.required { color: var(--color-danger); }

	.category-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}
	.category-option {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--border-default);
		background: var(--bg-overlay);
		cursor: pointer;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		transition: all var(--transition-fast);
	}
	.category-option:hover {
		border-color: var(--border-strong);
		color: var(--text-primary);
	}
	.category-option.selected {
		border-color: var(--color-primary);
		background: var(--color-primary-alpha-12);
		color: var(--color-primary-light);
	}
	.cat-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	.cat-name { white-space: nowrap; }

	.textarea {
		resize: vertical;
		min-height: 80px;
		font-family: inherit;
	}

	.toggle-label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
	}

	.hint-text {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin-top: 0.35rem;
		margin-bottom: 0;
	}
	.link-inline {
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
