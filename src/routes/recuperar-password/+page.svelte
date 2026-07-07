<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
	import { AlertCircle, CheckCircle2 } from '@lucide/svelte';
	import type { ActionData } from './$types';
	
	let { form }: { form: ActionData } = $props();
	
	let loading = $state(false);
	let email = $state('');
</script>

<svelte:head>
	<title>Recuperar Contraseña — Agenda Educativa</title>
</svelte:head>

<div class="login-page">
	<div class="login-bg">
		<div class="bg-orb orb-1"></div>
		<div class="bg-orb orb-2"></div>
		<div class="bg-orb orb-3"></div>
	</div>

	<div class="login-container">
		<div class="login-brand">
			<div class="brand-icon">
				<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
					<rect width="32" height="32" rx="10" fill="var(--color-primary, #2563eb)"/>
					<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
					<circle cx="24" cy="10" r="4" fill="var(--color-secondary, #7c3aed)"/>
				</svg>
			</div>
			<div>
				<h1 class="brand-name">Agenda Educativa</h1>
				<p class="brand-tagline">Recuperación de Acceso</p>
			</div>
		</div>

		<div class="login-card">
			<div class="login-card-header">
				<h2>Restablecer contraseña</h2>
				<p>Te enviaremos un enlace a tu correo para crear una nueva contraseña.</p>
			</div>

			{#if form?.error}
				<Alert variant="destructive">
					<AlertCircle size={16} />
					<AlertDescription>{form.error}</AlertDescription>
				</Alert>
			{:else if form?.success}
				<Alert variant="success">
					<CheckCircle2 size={16} />
					<AlertTitle>¡Correo enviado!</AlertTitle>
					<AlertDescription>Si la dirección existe en nuestro sistema, recibirás un enlace de recuperación en los próximos minutos.</AlertDescription>
				</Alert>
			{/if}

			{#if !form?.success}
				<form
					method="POST"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
				>
					<div class="form-group">
						<label class="input-label" for="email">Correo electrónico</label>
						<div class="input-wrapper">
							<svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
							</svg>
							<input
								id="email"
								name="email"
								type="email"
								class="input has-icon"
								placeholder="tu@correo.com"
								bind:value={email}
								required
							/>
						</div>
					</div>

					<button type="submit" class="btn btn-primary btn-login" disabled={loading} style="margin-top: 1rem;">
						{#if loading}
							<span class="spinner"></span>
							Enviando...
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
							</svg>
							Enviar Enlace
						{/if}
					</button>
				</form>
			{/if}

			<div style="text-align: center; margin-top: 1rem;">
				<a href="/login" style="font-size: 0.875rem; color: var(--text-muted); text-decoration: none;">Volver al inicio de sesión</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Mismos estilos base de login para mantener el look & feel */
	.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: var(--bg-base); }
	.login-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
	.bg-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.12; }
	.orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, #2563eb, transparent); top: -100px; left: -100px; }
	.orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, #7c3aed, transparent); bottom: -80px; right: -80px; }
	.orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, #0891b2, transparent); top: 50%; left: 60%; }
	
	.login-container { position: relative; z-index: 1; width: 100%; max-width: 420px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
	
	.login-brand { display: flex; align-items: center; gap: 0.875rem; }
	.brand-icon { filter: drop-shadow(0 0 16px light-dark(rgba(37, 99, 235, 0.3), rgba(59, 130, 246, 0.5))); }
	.brand-name { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
	.brand-tagline { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; }
	
	.login-card { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 2rem; box-shadow: var(--shadow-lg); display: flex; flex-direction: column; gap: 1.25rem; }
	.login-card-header h2 { font-size: 1.375rem; font-weight: 800; color: var(--text-primary); }
	.login-card-header p { color: var(--text-muted); font-size: 0.9375rem; margin-top: 0.25rem; }
	
	.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
	.input-label { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
	.input-wrapper { position: relative; display: flex; align-items: center; }
	.input-icon { position: absolute; left: 0.875rem; color: var(--text-muted); pointer-events: none; }
	.input.has-icon { padding-left: 2.5rem; }
	.input { width: 100%; height: 2.75rem; padding: 0 0.875rem; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.9375rem; outline: none; transition: border-color var(--transition-fast); }
	.input:focus { border-color: var(--color-primary); }
	
	.btn-login { width: 100%; height: 2.75rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 500; }
	.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
