<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { Users, Plus, UserPlus, X, Mail, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';

	let { data }: { data: PageData } = $props();

	let newCourseName = $state('');
	let creatingCourse = $state(false);

	let inviteFullName = $state('');
	let inviteEmail = $state('');
	let inviteRole = $state('student');
	let inviteCourseId = $state('');
	let inviting = $state(false);
	let inviteMessage = $state('');
	let inviteError = $state('');
</script>

<svelte:head>
	<title>Alumnos y Tutores — Agenda Educativa</title>
</svelte:head>

<div class="page-header">
	<div class="page-header-content">
		<div>
			<h1 class="page-title">Alumnos y Tutores</h1>
			<p class="page-subtitle">Gestioná cursos e invitá alumnos y tutores para que reciban notificaciones</p>
		</div>
	</div>
</div>

<div class="page-body">
	<div class="alumnos-layout">

		<!-- Cursos -->
		<div class="card courses-panel">
			<h2 class="section-title">
				<Users size="18" /> Cursos
			</h2>

			<form method="POST" action="?/createCourse" use:enhance={() => {
				creatingCourse = true;
				return async ({ result, update }) => {
					creatingCourse = false;
					if (result.type === 'success') {
						newCourseName = '';
						await invalidateAll();
					} else {
						await update();
					}
				};
			}}>
				<div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
					<input type="text" name="name" class="input" placeholder="Ej: 3ro A" bind:value={newCourseName} required />
					<button type="submit" class="btn btn-primary" disabled={creatingCourse}>
						<Plus size="16" /> Crear
					</button>
				</div>
			</form>

			<div class="courses-list">
				{#each data.courses as course}
					<div class="course-card">
						<div class="course-header">
							<h3 class="course-name">{course.name}</h3>
							<span class="badge">{course.course_members.length} miembros</span>
						</div>

						<!-- Profesores responsables -->
						<div class="subsection">
							<p class="subsection-title">Profesores responsables</p>
							<div class="members-list">
								{#each course.course_members.filter(m => m.profiles.role === 'teacher') as member}
									<div class="member-chip">
										<div class="avatar">
											{(member.profiles.full_name || 'U')[0].toUpperCase()}
										</div>
										<span class="name">{member.profiles.full_name}</span>
										<span class="role-tag">Profesor</span>
										<form method="POST" action="?/removeMember" use:enhance>
											<input type="hidden" name="course_id" value={course.id} />
											<input type="hidden" name="user_id" value={member.user_id} />
											<button type="submit" class="remove-btn" title="Remover"><X size="12" /></button>
										</form>
									</div>
								{:else}
									<p class="empty-members">Sin profesor asignado — ningún docente podrá crear eventos para este curso.</p>
								{/each}
							</div>
							<div class="add-member-form">
								<form method="POST" action="?/addMember" use:enhance>
									<input type="hidden" name="course_id" value={course.id} />
									<div style="display:flex;gap:0.5rem;">
										<select name="user_id" class="input" required style="padding:0.25rem 0.5rem;height:auto;font-size:0.875rem;">
											<option value="">Asignar docente...</option>
											{#each data.teachers as t}
												{#if !course.course_members.some(m => m.user_id === t.id)}
													<option value={t.id}>{t.full_name ?? '(sin nombre)'}</option>
												{/if}
											{/each}
										</select>
										<button type="submit" class="btn btn-ghost" style="padding:0.25rem 0.5rem;">
											<UserPlus size="14" />
										</button>
									</div>
								</form>
							</div>
						</div>

						<!-- Alumnos y tutores -->
						<div class="subsection">
							<p class="subsection-title">Alumnos y tutores</p>
							<div class="members-list">
								{#each course.course_members.filter(m => m.profiles.role !== 'teacher') as member}
									<div class="member-chip">
										<div class="avatar">
											{(member.profiles.full_name || 'U')[0].toUpperCase()}
										</div>
										<span class="name">{member.profiles.full_name}</span>
										<span class="role-tag">{member.profiles.role === 'student' ? 'Alumno' : 'Tutor'}</span>
										<form method="POST" action="?/removeMember" use:enhance>
											<input type="hidden" name="course_id" value={course.id} />
											<input type="hidden" name="user_id" value={member.user_id} />
											<button type="submit" class="remove-btn" title="Remover"><X size="12" /></button>
										</form>
									</div>
								{:else}
									<p class="empty-members">Sin miembros aún.</p>
								{/each}
							</div>

							<!-- Add existing member -->
							<div class="add-member-form">
								<form method="POST" action="?/addMember" use:enhance>
									<input type="hidden" name="course_id" value={course.id} />
									<div style="display:flex;gap:0.5rem;">
										<select name="user_id" class="input" required style="padding:0.25rem 0.5rem;height:auto;font-size:0.875rem;">
											<option value="">Agregar alumno/tutor existente...</option>
											{#each data.students as st}
												{#if !course.course_members.some(m => m.user_id === st.id)}
													<option value={st.id}>{st.full_name ?? '(sin nombre)'} ({st.role === 'student' ? 'Alumno' : 'Tutor'})</option>
												{/if}
											{/each}
										</select>
										<button type="submit" class="btn btn-ghost" style="padding:0.25rem 0.5rem;">
											<UserPlus size="14" />
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				{:else}
					<div class="empty-state">
						<Users size="32" class="empty-state-icon" />
						<span class="empty-state-title">No hay cursos creados</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Invitar + listado -->
		<div class="side-panels">
			<div class="card invite-panel">
				<h2 class="section-title">
					<Mail size="18" /> Invitar Alumno/Tutor
				</h2>

				{#if inviteMessage}
					<Alert variant="success" class="mb-4">
						<CheckCircle2 size={16} />
						<AlertDescription>{inviteMessage}</AlertDescription>
					</Alert>
				{/if}
				{#if inviteError}
					<Alert variant="destructive" class="mb-4">
						<AlertCircle size={16} />
						<AlertDescription>{inviteError}</AlertDescription>
					</Alert>
				{/if}

				<form method="POST" action="?/inviteMember" use:enhance={() => {
					inviting = true;
					inviteMessage = '';
					inviteError = '';
					return async ({ result, update }) => {
						inviting = false;
						if (result.type === 'success') {
							inviteMessage = 'Invitación enviada correctamente.';
							inviteFullName = '';
							inviteEmail = '';
							inviteCourseId = '';
							await invalidateAll();
						} else if (result.type === 'failure') {
							inviteError = (result.data?.error as string) ?? 'Error al invitar.';
						} else {
							await update();
						}
					};
				}}>
					<div class="form-group">
						<label class="input-label" for="invite-name">Nombre completo</label>
						<input id="invite-name" type="text" name="full_name" class="input" bind:value={inviteFullName} required />
					</div>
					<div class="form-group">
						<label class="input-label" for="invite-email">Email</label>
						<input id="invite-email" type="email" name="email" class="input" bind:value={inviteEmail} required />
					</div>
					<div class="form-group">
						<label class="input-label" for="invite-role">Rol</label>
						<select id="invite-role" name="role" class="input" bind:value={inviteRole}>
							<option value="student">Alumno/a</option>
							<option value="tutor">Tutor/a</option>
						</select>
					</div>
					<div class="form-group">
						<label class="input-label" for="invite-course">Curso (opcional)</label>
						<select id="invite-course" name="course_id" class="input" bind:value={inviteCourseId}>
							<option value="">Sin asignar</option>
							{#each data.courses as c}
								<option value={c.id}>{c.name}</option>
							{/each}
						</select>
					</div>
					<button type="submit" class="btn btn-primary" disabled={inviting} style="width:100%;">
						{inviting ? 'Enviando...' : 'Invitar'}
					</button>
				</form>
			</div>

			<div class="card students-panel">
				<h2 class="section-title">Todos los Alumnos y Tutores</h2>
				<div class="students-list">
					{#each data.students as st}
					<div class="student-row">
						<div class="avatar" style="background:{st.role === 'student' ? 'var(--role-student, #10b981)' : 'var(--role-tutor, #ec4899)'}">
							{(st.full_name ?? 'U')[0].toUpperCase()}
						</div>
						<div class="info">
							<p class="s-name">{st.full_name ?? 'Sin nombre'}</p>
							<p class="s-email">{st.role === 'student' ? 'Alumno/a' : 'Tutor/a'}</p>
						</div>
					</div>
				{:else}
					<p style="font-size:0.875rem;color:var(--text-muted);font-style:italic;">No hay alumnos ni tutores en esta escuela.</p>
				{/each}
				</div>
			</div>
		</div>

	</div>
</div>

<style>
	.alumnos-layout {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1.5rem;
		align-items: start;
	}
	@media (max-width: 900px) { .alumnos-layout { grid-template-columns: 1fr; } }

	.side-panels {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.form-group { margin-bottom: 1rem; }

	.courses-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.course-card {
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem;
		background: var(--bg-surface);
	}
	.course-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.course-name { font-weight: 600; font-size: 1rem; color: var(--text-primary); }

	.subsection { margin-bottom: 1.25rem; }
	.subsection:last-child { margin-bottom: 0; }
	.subsection-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.5rem;
	}

	.members-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.member-chip {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.5rem 0.25rem 0.25rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 999px;
		font-size: 0.8125rem;
	}
	.member-chip .avatar {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-primary);
		color: var(--text-on-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.6rem;
		font-weight: bold;
	}
	.role-tag {
		font-size: 0.7rem;
		color: var(--text-muted);
	}
	.member-chip .remove-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		padding: 0;
		margin-left: 0.2rem;
	}
	.member-chip .remove-btn:hover { color: var(--color-danger); }

	.empty-members { font-size: 0.875rem; color: var(--text-muted); }

	.add-member-form {
		border-top: 1px solid var(--border-subtle);
		padding-top: 0.75rem;
	}

	.students-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.student-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
	}
	.student-row .avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}
	.s-name { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
	.s-email { font-size: 0.75rem; color: var(--text-muted); }
</style>
