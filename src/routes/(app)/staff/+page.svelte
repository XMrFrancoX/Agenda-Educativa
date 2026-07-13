<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { Users, Plus, UserPlus, X } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let newGroupName = $state('');
	let creating = $state(false);

	let selectedGroupForUser = $state<string | null>(null);
	let selectedUser = $state('');
</script>

<svelte:head>
	<title>Planificador Staff — Agenda Educativa</title>
</svelte:head>

<div class="page-header">
	<div class="page-header-content">
		<div>
			<h1 class="page-title">Planificador Staff</h1>
			<p class="page-subtitle">Gestiona los grupos de docentes para asignarles tareas o eventos</p>
		</div>
	</div>
</div>

<div class="page-body">
	<div class="staff-layout">
		
		<!-- Grupos -->
		<div class="card groups-panel">
			<h2 class="section-title">
				<Users size="18" /> Grupos de Staff
			</h2>

			<form method="POST" action="?/createGroup" use:enhance={() => {
				creating = true;
				return async ({ result, update }) => {
					creating = false;
					if (result.type === 'success') {
						newGroupName = '';
						await invalidateAll();
					} else {
						await update();
					}
				};
			}}>
				<div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
					<input type="text" name="name" class="input" placeholder="Ej: Profesores de Matemática" bind:value={newGroupName} required />
					<button type="submit" class="btn btn-primary" disabled={creating}>
						<Plus size="16" /> Crear
					</button>
				</div>
			</form>

			<div class="groups-list">
				{#each data.groups as group}
					<div class="group-card">
						<div class="group-header">
							<h3 class="group-name">{group.name}</h3>
							<span class="badge">{group.staff_group_members.length} miembros</span>
						</div>

						<!-- Members list -->
						<div class="members-list">
							{#each group.staff_group_members as member}
								<div class="member-chip">
									<div class="avatar">
										{(member.profiles.full_name || 'U')[0].toUpperCase()}
									</div>
									<span class="name">{member.profiles.full_name}</span>
									<form method="POST" action="?/removeMember" use:enhance>
										<input type="hidden" name="group_id" value={group.id} />
										<input type="hidden" name="user_id" value={member.user_id} />
										<button type="submit" class="remove-btn" title="Remover"><X size="12" /></button>
									</form>
								</div>
							{:else}
								<p class="empty-members">Sin miembros aún.</p>
							{/each}
						</div>

						<!-- Add member form -->
						<div class="add-member-form">
							<form method="POST" action="?/addMember" use:enhance>
								<input type="hidden" name="group_id" value={group.id} />
								<div style="display:flex;gap:0.5rem;">
									<select name="user_id" class="input" required style="padding:0.25rem 0.5rem;height:auto;font-size:0.875rem;">
										<option value="">Seleccionar docente...</option>
										{#each data.teachers as teacher}
											{#if !group.staff_group_members.some(m => m.user_id === teacher.id)}
												<option value={teacher.id}>{teacher.full_name ?? '(sin nombre)'}</option>
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
				{:else}
					<div class="empty-state">
						<Users size="32" class="empty-state-icon" />
						<span class="empty-state-title">No hay grupos creados</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Listado General -->
		<div class="card teachers-panel">
			<h2 class="section-title">Todos los Docentes</h2>
			<div class="teachers-list">
				{#each data.teachers as teacher}
				<div class="teacher-row">
					<div class="avatar" style="background:var(--role-teacher)">
						{(teacher.full_name ?? 'U')[0].toUpperCase()}
					</div>
					<div class="info">
						<p class="t-name">{teacher.full_name ?? 'Sin nombre'}</p>
						<p class="t-email">{teacher.role === 'director' ? 'Director' : 'Docente'}</p>
					</div>
				</div>
			{:else}
				<p style="font-size:0.875rem;color:var(--text-muted);font-style:italic;">No hay docentes en esta escuela.</p>
			{/each}
			</div>
		</div>

	</div>
</div>

<style>
	.staff-layout {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1.5rem;
		align-items: start;
	}
	@media (max-width: 900px) { .staff-layout { grid-template-columns: 1fr; } }

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.groups-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.group-card {
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem;
		background: var(--bg-surface);
	}
	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.group-name { font-weight: 600; font-size: 1rem; color: var(--text-primary); }
	
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

	.teachers-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.teacher-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
	}
	.teacher-row .avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}
	.t-name { font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
	.t-email { font-size: 0.75rem; color: var(--text-muted); }
</style>
