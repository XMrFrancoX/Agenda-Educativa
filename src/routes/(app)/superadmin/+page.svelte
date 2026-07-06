<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { Building, Users, AlertCircle, Save, Plus, Search } from 'lucide-svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { data }: { data: PageData } = $props();

	let newSchoolName = $state('');
	let creatingSchool = $state(false);

	// Confirmación de borrado de escuela
	let deleteSchoolOpen = $state(false);
	let schoolFormToDelete: HTMLFormElement | null = null;
	function requestDeleteSchool(e: MouseEvent) {
		schoolFormToDelete = (e.currentTarget as HTMLElement).closest('form');
		deleteSchoolOpen = true;
	}
	function confirmDeleteSchool() {
		schoolFormToDelete?.requestSubmit();
	}

	// Búsqueda
	let searchSchool = $state('');
	let searchUser = $state('');

	// Filtros reactivos
	let unassignedUsers = $derived(data.profiles.filter(p => p.school_id === null));
	let assignedUsers = $derived(
		data.profiles
			.filter(p => p.school_id !== null)
			.filter(p => {
				if (!searchUser) return true;
				const q = searchUser.toLowerCase();
				return (p.full_name ?? '').toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q);
			})
	);
	let filteredSchools = $derived(
		data.schools.filter(s => {
			if (!searchSchool) return true;
			return s.name.toLowerCase().includes(searchSchool.toLowerCase());
		})
	);

	let uploadingLogoId = $state<string | null>(null);
	let processingSchoolId = $state<string | null>(null);
	let savingUserId = $state<string | null>(null);
</script>

<svelte:head>
	<title>Global Admin — Agenda Educativa</title>
</svelte:head>

<div class="page-container">
	<header class="page-header">
		<div>
			<h1 class="page-title">Panel Global (Super Admin)</h1>
			<p class="page-description">Gestión de escuelas, usuarios y dominios de la plataforma.</p>
		</div>
	</header>
</div>

<div class="page-body">
	<!-- Usuarios pendientes de asignación -->
	{#if unassignedUsers.length > 0}
		<div class="card alert-card">
			<div class="alert-header">
				<AlertCircle size="20" class="alert-icon" />
				<h3>Usuarios pendientes de asignación ({unassignedUsers.length})</h3>
			</div>
			<p class="alert-text">Estos usuarios se han registrado pero aún no tienen una escuela asignada, por lo que no pueden usar el sistema correctamente.</p>
			
			<div class="users-grid">
				{#each unassignedUsers as user}
					<div class="user-row pending">
						<div class="user-info">
							<div class="avatar" style="background:var(--color-danger)">
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
								if (result.type === 'success') await invalidateAll();
								else await update();
							};
						}}>
							<input type="hidden" name="user_id" value={user.id} />
							
							<div class="form-group-inline">
								<select name="role" class="input slim-select" value={user.role} required>
									<option value="student">Alumno/a</option>
									<option value="tutor">Tutor/a</option>
									<option value="teacher">Docente</option>
									<option value="director">Director</option>
									<option value="admin">Admin. Escuela</option>
									<option value="superadmin">Super Admin</option>
								</select>

								<select name="school_id" class="input slim-select" required>
									<option value="" disabled selected>Asignar escuela...</option>
									{#each data.schools as school}
										<option value={school.id}>{school.name}</option>
									{/each}
								</select>

								<button type="submit" class="btn btn-primary slim-btn" disabled={savingUserId === user.id}>
									{#if savingUserId === user.id}
										<span class="spinner" style="width:14px;height:14px"></span>
									{:else}
										<Save size="14" />
									{/if}
									Guardar
								</button>
							</div>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="admin-layout">
		<!-- Gestión de Escuelas -->
		<div class="card">
			<h2 class="section-title">
				<Building size="18" /> Escuelas Registradas
			</h2>

			<form method="POST" action="?/createSchool" use:enhance={() => {
				creatingSchool = true;
				return async ({ result, update }) => {
					creatingSchool = false;
					if (result.type === 'success') {
						newSchoolName = '';
						await invalidateAll();
					} else await update();
				};
			}}>
				<div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
					<input type="text" name="name" class="input" placeholder="Nombre de la nueva escuela..." bind:value={newSchoolName} required />
					<button type="submit" class="btn btn-primary" disabled={creatingSchool}>
						<Plus size="16" /> Crear
					</button>
				</div>
			</form>

			<div class="input-wrapper" style="margin-bottom:1rem;">
				<Search size="16" class="input-icon" />
				<input type="text" class="input has-icon" placeholder="Buscar escuela..." bind:value={searchSchool} style="width:100%;" />
			</div>

			<div class="schools-list">
				{#each filteredSchools as school}
					<div class="school-item" class:suspended={school.status === 'suspended'}>
						<div class="school-header">
							{#if school.logo_url}
								<img src={school.logo_url} alt="Logo de {school.name}" class="school-logo-preview" />
							{:else}
								<div class="school-logo-placeholder"><Building size="16"/></div>
							{/if}
							<div>
								<span class="school-name">
									{school.name}
									{#if school.status === 'suspended'}
										<span class="badge role-danger" style="margin-left:0.5rem;font-size:0.65rem;">Suspendida</span>
									{/if}
								</span>
								<span class="badge">ID: {school.id.split('-')[0]}...</span>
							</div>
						</div>
						
						<div class="school-actions">
							<!-- Formulario para Color -->
							<form method="POST" action="?/updateColor" use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') await invalidateAll();
									else await update();
								};
							}}>
								<input type="hidden" name="school_id" value={school.id} />
								<div class="color-picker-wrapper" title="Color principal">
									<input 
										type="color" 
										name="color" 
										value={school.primary_color ?? '#2563eb'}
										class="color-input" 
										onchange={(e) => e.currentTarget.form?.requestSubmit()} 
									/>
								</div>
							</form>

							<!-- Formulario para subir logo -->
							<form method="POST" action="?/uploadLogo" enctype="multipart/form-data" use:enhance={() => {
								uploadingLogoId = school.id;
								return async ({ result, update }) => {
									uploadingLogoId = null;
									if (result.type === 'success') await invalidateAll();
									else if (result.type === 'failure') {
										// @ts-ignore
										alert(result.data?.error || 'Error al subir logo');
									}
									await update();
								};
							}}>
								<input type="hidden" name="school_id" value={school.id} />
								<div class="upload-wrapper">
									<input type="file" name="logo" id="logo-{school.id}" class="file-input" accept=".jpg,.jpeg,.png,.webp,.svg" required onchange={(e) => e.currentTarget.form?.requestSubmit()} />
									<label for="logo-{school.id}" class="btn btn-ghost slim-btn" title="Subir Logo">
										{#if uploadingLogoId === school.id}
											<span class="spinner" style="width:14px;height:14px"></span>
										{:else}
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
										{/if}
									</label>
								</div>
							</form>

							<!-- Suspender -->
							<form method="POST" action="?/toggleSchoolStatus" use:enhance={() => {
								processingSchoolId = school.id;
								return async ({ result, update }) => {
									processingSchoolId = null;
									if (result.type === 'success') await invalidateAll();
									else await update();
								};
							}}>
								<input type="hidden" name="school_id" value={school.id} />
								<input type="hidden" name="current_status" value={school.status} />
								<button type="submit" class="btn btn-ghost slim-btn {school.status === 'suspended' ? 'text-success' : 'text-warning'}" disabled={processingSchoolId === school.id} title={school.status === 'suspended' ? 'Reactivar' : 'Suspender'}>
									{#if processingSchoolId === school.id}
										<span class="spinner" style="width:14px;height:14px"></span>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											{#if school.status === 'suspended'}
												<path d="M5 12l5 5l10 -10" />
											{:else}
												<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
											{/if}
										</svg>
									{/if}
								</button>
							</form>

							<!-- Eliminar -->
							<form method="POST" action="?/deleteSchool" use:enhance={() => {
								processingSchoolId = school.id;
								return async ({ result, update }) => {
									processingSchoolId = null;
									if (result.type === 'success') await invalidateAll();
									else await update();
								};
							}}>
								<input type="hidden" name="school_id" value={school.id} />
								<button type="button" onclick={requestDeleteSchool} class="btn btn-ghost slim-btn text-danger" disabled={processingSchoolId === school.id} title="Eliminar definitivamente">
									{#if processingSchoolId === school.id}
										<span class="spinner" style="width:14px;height:14px"></span>
									{:else}
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
									{/if}
								</button>
							</form>
						</div>

						<div style="margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
							<label for="domain-{school.id}" class="input-label" style="font-size: 0.75rem;">Dominio Personalizado</label>
							<form method="POST" action="?/updateDomain" style="display: flex; gap: 0.5rem;" use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										await invalidateAll();
										alert('Dominio actualizado con éxito.');
									} else if (result.type === 'failure') {
										// @ts-ignore
										alert(result.data?.error || 'Error al actualizar el dominio.');
									}
									await update();
								};
							}}>
								<input type="hidden" name="school_id" value={school.id} />
								<input id="domain-{school.id}" type="text" name="domain" class="input" placeholder="ej: colegio.edu.ar" value={school.custom_domain || ''} style="padding: 0.4rem 0.6rem; font-size: 0.8rem;" />
								<button type="submit" class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Vincular</button>
							</form>
						</div>

						<!-- WhatsApp toggle -->
						<div style="margin-top: 0.75rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; display:flex; align-items:center; justify-content:space-between;">
							<div>
								<span style="font-size:0.75rem; font-weight:600; color:var(--text-secondary);">Notificaciones WhatsApp</span>
								<span style="display:block; font-size:0.7rem; color:var(--text-muted);">Servicio premium — activar para esta escuela</span>
							</div>
							<form method="POST" action="?/toggleWhatsapp" use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') await invalidateAll();
									else await update();
								};
							}}>
								<input type="hidden" name="school_id" value={school.id} />
								<input type="hidden" name="current_value" value={school.whatsapp_enabled ? 'true' : 'false'} />
								<button type="submit" class="toggle-btn {school.whatsapp_enabled ? 'toggle-on' : 'toggle-off'}" title="{school.whatsapp_enabled ? 'Deshabilitar WhatsApp' : 'Habilitar WhatsApp'}">
									<span class="toggle-knob"></span>
								</button>
							</form>
						</div>
					</div>
				{:else}
					<p class="empty-text">No hay escuelas creadas.</p>
				{/each}
			</div>
		</div>

		<!-- Gestión General de Usuarios -->
		<div class="card">
			<h2 class="section-title">
				<Users size="18" /> Usuarios Asignados
			</h2>
			<div class="input-wrapper" style="margin-bottom:1rem;">
				<Search size="16" class="input-icon" />
				<input type="text" class="input has-icon" placeholder="Buscar por nombre o email..." bind:value={searchUser} style="width:100%;" />
			</div>
			<div class="users-grid">
				{#each assignedUsers as user}
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
								if (result.type === 'success') await invalidateAll();
								else await update();
							};
						}}>
							<input type="hidden" name="user_id" value={user.id} />
							
							<div class="form-group-inline">
								<select name="role" class="input slim-select" value={user.role} required>
									<option value="student">Alumno/a</option>
									<option value="tutor">Tutor/a</option>
									<option value="teacher">Docente</option>
									<option value="director">Director</option>
									<option value="admin">Admin</option>
									<option value="superadmin">Super Admin</option>
								</select>

								<select name="school_id" class="input slim-select" value={user.school_id}>
									<option value="">Ninguna (Remover)</option>
									{#each data.schools as school}
										<option value={school.id}>{school.name}</option>
									{/each}
								</select>

								<button type="submit" class="btn btn-ghost slim-btn" title="Guardar cambios" disabled={savingUserId === user.id}>
									{#if savingUserId === user.id}
										<span class="spinner" style="width:14px;height:14px"></span>
									{:else}
										<Save size="16" />
									{/if}
								</button>
							</div>
						</form>
					</div>
				{:else}
					<p class="empty-text">No hay usuarios asignados a ninguna escuela.</p>
				{/each}
			</div>
		</div>
	</div>
</div>

<ConfirmDialog
	bind:open={deleteSchoolOpen}
	title="Eliminar escuela"
	description="¿Estás seguro de eliminar TOTALMENTE esta escuela y todos sus datos? Esta acción no se puede deshacer."
	confirmLabel="Eliminar definitivamente"
	onConfirm={confirmDeleteSchool}
/>

<style>
	.admin-layout {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 1.5rem;
		align-items: start;
	}
	@media (max-width: 1024px) { .admin-layout { grid-template-columns: 1fr; } }

	.input-wrapper { position: relative; }
	.input-wrapper :global(.input-icon) {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
		pointer-events: none;
	}
	.input.has-icon { padding-left: 2.5rem; }

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 1.5rem;
	}

	.alert-card {
		border: 1px solid rgba(220, 38, 38, 0.3);
		background: rgba(220, 38, 38, 0.1);
		margin-bottom: 1.5rem;
	}
	.alert-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-danger);
		margin-bottom: 0.5rem;
	}
	.alert-header h3 { font-size: 1rem; font-weight: 600; margin: 0; }
	.alert-text { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1rem; }

	.schools-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.school-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		gap: 1rem;
		flex-wrap: wrap;
	}
	.school-item.suspended {
		background: rgba(0,0,0,0.2);
		opacity: 0.8;
	}
	
	.school-header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.school-actions {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.school-name { display:block; font-weight: 500; font-size: 0.875rem; color: var(--text-primary); }
	
	.role-danger { background: light-dark(rgba(220,38,38,0.1), rgba(239, 68, 68, 0.1)); color: light-dark(#b91c1c, #ef4444); border: 1px solid light-dark(rgba(220,38,38,0.2), rgba(239, 68, 68, 0.2)); }
	.text-danger { color: light-dark(#dc2626, #ef4444); }
	.text-danger:hover { background: light-dark(rgba(220,38,38,0.1), rgba(239, 68, 68, 0.1)) !important; }
	.text-warning { color: light-dark(#b45309, #f59e0b); }
	.text-warning:hover { background: light-dark(rgba(180,83,9,0.1), rgba(245, 158, 11, 0.1)) !important; }
	.text-success { color: light-dark(#059669, #10b981); }
	.text-success:hover { background: light-dark(rgba(5,150,105,0.1), rgba(16, 185, 129, 0.1)) !important; }

	.color-picker-wrapper {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid var(--border-default);
		cursor: pointer;
		display: inline-block;
	}
	.color-input {
		width: 150%;
		height: 150%;
		margin: -25%;
		cursor: pointer;
		border: none;
		padding: 0;
	}

	.school-logo-preview {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		object-fit: cover;
		border: 1px solid var(--border-subtle);
	}
	.school-logo-placeholder {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		background: var(--bg-elevated);
		border: 1px dashed var(--border-default);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
	}

	.upload-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.file-input {
		width: 130px;
		font-size: 0.75rem;
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
	.user-row.pending {
		background: var(--bg-surface);
		border-color: rgba(220, 38, 38, 0.3);
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
		color: white;
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
	
	.empty-text { font-size: 0.875rem; color: var(--text-muted); font-style: italic; }

	/* Toggle switch */
	.toggle-btn {
		position: relative;
		width: 44px;
		height: 24px;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		transition: background 0.25s;
		flex-shrink: 0;
	}
	.toggle-on { background: var(--color-success); }
	.toggle-off { background: var(--border-default); }
	.toggle-knob {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		transition: transform 0.25s;
		display: block;
	}
	.toggle-on .toggle-knob { transform: translateX(20px); }
</style>

