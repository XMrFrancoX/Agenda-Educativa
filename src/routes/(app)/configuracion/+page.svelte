<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let prefs = $state({ ...(data.preferences ?? {}) });
	let saving = $state(false);
	let saved = $state(false);

	async function savePreferences() {
		saving = true;
		saved = false;
		await fetch('/api/preferences', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(prefs)
		});
		await invalidateAll();
		saving = false;
		saved = true;
		setTimeout(() => (saved = false), 3000);
	}
</script>

<svelte:head>
	<title>Configuración — Agenda Educativa</title>
</svelte:head>

<div class="page-header">
	<h1 class="page-title">Configuración</h1>
	<p class="page-subtitle">Personalización de notificaciones y preferencias</p>
</div>

<div class="page-body">
	<div class="settings-grid">
		<!-- Perfil -->
		<div class="card settings-card">
			<h3 class="settings-section-title">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
				</svg>
				Mi perfil
			</h3>
			<div class="profile-display">
				<div class="profile-avatar-lg" style="background: linear-gradient(135deg, #6366f1, #8b5cf6)">
					{(data.profile?.full_name ?? 'U')[0].toUpperCase()}
				</div>
				<div>
					<p class="profile-name-lg">{data.profile?.full_name ?? '—'}</p>
					<p class="profile-email-lg">{data.user?.email}</p>
					<span class="badge {data.profile?.role === 'director' ? 'role-director' : 'role-teacher'}" style="margin-top:.5rem;display:inline-block">
						{data.profile?.role === 'director' ? 'Director/a' : 'Docente'}
					</span>
				</div>
			</div>
		</div>

		<!-- Notificaciones -->
		<div class="card settings-card">
			<h3 class="settings-section-title">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
				</svg>
				Notificaciones
			</h3>

			<div class="settings-item">
				<div>
					<p class="settings-item-title">Notificaciones por Email</p>
					<p class="settings-item-desc">Recibir alertas de eventos vía correo electrónico</p>
				</div>
				<label class="toggle-wrapper">
					<div class="toggle">
						<input type="checkbox" bind:checked={prefs.notify_email} onchange={savePreferences} />
						<div class="toggle-track"></div>
						<div class="toggle-thumb"></div>
					</div>
				</label>
			</div>

			<div class="settings-item">
				<div>
					<p class="settings-item-title">Notificaciones por WhatsApp</p>
					<p class="settings-item-desc">Recibir alertas de eventos vía WhatsApp</p>
				</div>
				<label class="toggle-wrapper">
					<div class="toggle">
						<input type="checkbox" bind:checked={prefs.notify_whatsapp} onchange={savePreferences} />
						<div class="toggle-track"></div>
						<div class="toggle-thumb"></div>
					</div>
				</label>
			</div>

			<div class="divider"></div>

			<div class="settings-item">
				<div>
					<p class="settings-item-title">Recordatorio 24 horas antes</p>
					<p class="settings-item-desc">Alerta un día antes del evento</p>
				</div>
				<label class="toggle-wrapper">
					<div class="toggle">
						<input type="checkbox" bind:checked={prefs.notify_24h} onchange={savePreferences} />
						<div class="toggle-track"></div>
						<div class="toggle-thumb"></div>
					</div>
				</label>
			</div>

			<div class="settings-item">
				<div>
					<p class="settings-item-title">Recordatorio 1 hora antes</p>
					<p class="settings-item-desc">Alerta una hora antes del evento</p>
				</div>
				<label class="toggle-wrapper">
					<div class="toggle">
						<input type="checkbox" bind:checked={prefs.notify_1h} onchange={savePreferences} />
						<div class="toggle-track"></div>
						<div class="toggle-thumb"></div>
					</div>
				</label>
			</div>

			{#if saved}
				<p class="save-feedback">✓ Preferencias guardadas</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.settings-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		max-width: 860px;
	}
	@media (max-width: 700px) { .settings-grid { grid-template-columns: 1fr; } }

	.settings-card { display: flex; flex-direction: column; gap: 1rem; }
	.settings-section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.profile-display { display: flex; align-items: center; gap: 1rem; }
	.profile-avatar-lg {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 800;
		color: white;
		flex-shrink: 0;
	}
	.profile-name-lg { font-weight: 700; font-size: 0.9375rem; color: var(--text-primary); }
	.profile-email-lg { font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.1rem; }

	.settings-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
	}
	.settings-item-title { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
	.settings-item-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.1rem; }

	.save-feedback {
		font-size: 0.8rem;
		color: var(--color-success);
		text-align: right;
		padding-top: 0.25rem;
	}
</style>
