<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { Users, Save } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	// Estado para rastrear si un usuario está siendo guardado
	let savingUserId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Gestión de Usuarios — Agenda Educativa</title>
</svelte:head>

<div class="page-container">
	<header class="page-header">
		<div>
			<h1 class="page-title">Administración de la Escuela</h1>
			<p class="page-description">Gestioná los roles y permisos de los integrantes de tu institución.</p>
		</div>
	</header>
</div>

<div class="page-body">
	<div class="card" style="max-width: 900px; margin: 0 auto;">
		<h2 class="section-title">
			<Users size="18" /> Personal y Alumnado
		</h2>
		
		<div class="users-grid">
			{#each data.profiles as user}
				<div class="user-row">
					<div class="user-info">
						<div class="avatar" style="background:var(--color-primary)">
							{(user.full_name || user.email || 'U')[0].toUpperCase()}
						</div>
						<div>
							<span class="user-name">{user.full_name || 'Sin nombre'}</span>
							<span class="user-email">{user.email}</span>
						</div>
					</div>
					
					<form method="POST" action="?/updateUser" class="inline-form" use:enhance={() => {
						savingUserId = user.id;
						return async ({ result, update }) => {
							savingUserId = null;
							if (result.type === 'success') {
								await invalidateAll();
							} else if (result.type === 'failure') {
								// @ts-ignore
								toast.error(result.data?.error || 'Error al actualizar usuario');
							}
							await update();
						};
					}}>
						<input type="hidden" name="user_id" value={user.id} />

						<div class="form-group-inline">
							<!-- El Admin de la escuela no puede modificar su propio rol a superadmin -->
							<select name="role" class="input slim-select" value={user.role} required disabled={user.role === 'superadmin'} title={user.role === 'superadmin' ? 'Tu rol actual de dueño del sistema no se puede modificar desde aquí por seguridad.' : 'Cambiar rol'}>
								<option value="student">Alumno/a</option>
								<option value="tutor">Tutor/a</option>
								<option value="teacher">Docente</option>
								<option value="director">Director</option>
								<option value="admin">Admin. Escuela</option>
								{#if user.role === 'superadmin'}
									<option value="superadmin">Super Admin</option>
								{/if}
							</select>

							{#if user.role !== 'superadmin'}
								<div class="extra-roles">
									<span class="extra-roles-label">También:</span>
									{#each ['teacher', 'director', 'admin'] as extra}
										{#if extra !== user.role}
											<label class="extra-role-chip">
												<input type="checkbox" name="extra_roles" value={extra} checked={user.extra_roles?.includes(extra)} />
												{extra === 'teacher' ? 'Docente' : extra === 'director' ? 'Director' : 'Admin'}
											</label>
										{/if}
									{/each}
								</div>
							{/if}

							<button type="submit" class="btn btn-primary slim-btn" title="Guardar cambios" disabled={savingUserId === user.id || user.role === 'superadmin'}>
								{#if savingUserId === user.id}
									<span class="spinner" style="width:14px;height:14px"></span>
								{:else}
									<Save size="16" />
								{/if}
								Guardar
							</button>
						</div>
					</form>
				</div>
				<!-- Mensaje de aclaración solo para superadmins -->
				{#if user.role === 'superadmin'}
					<p class="role-hint" style="font-size: 0.75rem; color: var(--text-muted); padding-left: 3rem; margin-top: -0.5rem; margin-bottom: 1rem;">
						* Tu rol es Super Admin (Dueño de la plataforma). Por medidas de seguridad, no podés revocar tus propios permisos.
					</p>
				{/if}
			{:else}
				<p class="empty-text">No hay usuarios en esta escuela.</p>
			{/each}
		</div>
	</div>
</div>

<style>
	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.users-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.user-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 200px;
	}
	.user-info .avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		color: var(--text-on-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.8rem;
	}
	.user-name { display: block; font-weight: 600; font-size: 0.875rem; color: var(--text-primary); }
	.user-email { display: block; font-size: 0.75rem; color: var(--text-muted); }

	.inline-form {
		display: flex;
		align-items: center;
	}
	.form-group-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.slim-select {
		padding: 0.25rem 1.5rem 0.25rem 0.5rem;
		height: 32px;
		font-size: 0.8125rem;
		min-width: 120px;
	}
	.slim-btn {
		height: 32px;
		padding: 0 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
	}

	.extra-roles {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.extra-roles-label { font-size: 0.75rem; color: var(--text-muted); }
	.extra-role-chip {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
		cursor: pointer;
		white-space: nowrap;
	}
	
	.empty-text { font-size: 0.875rem; color: var(--text-muted); font-style: italic; }
</style>
