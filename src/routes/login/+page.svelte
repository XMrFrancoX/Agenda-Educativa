<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let loading = $state(false);
	let showPassword = $state(false);
	let email = $state('');
	let password = $state('');
</script>

<svelte:head>
	<title>Iniciar Sesión — Agenda Educativa</title>
	<meta name="description" content="Ingresá a tu cuenta de Agenda Educativa" />
</svelte:head>

<div class="login-page">
	<!-- Background decoration -->
	<div class="login-bg">
		<div class="bg-orb orb-1"></div>
		<div class="bg-orb orb-2"></div>
		<div class="bg-orb orb-3"></div>
	</div>

	<div class="login-container">
		<!-- Logo & Branding -->
		<div class="login-brand">
			<div class="brand-icon">
				{#if data.tenant?.logo_url}
					<img src={data.tenant.logo_url} alt="Logo Institucional" style="width: 32px; height: 32px; border-radius: 6px; object-fit: contain;" />
				{:else}
					<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
						<rect width="32" height="32" rx="10" fill="var(--color-primary, #6366f1)"/>
						<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
						<circle cx="24" cy="10" r="4" fill="var(--text-secondary, #8b5cf6)"/>
					</svg>
				{/if}
			</div>
			<div>
				<h1 class="brand-name">{data.tenant?.name || 'Agenda Educativa'}</h1>
				<p class="brand-tagline">{data.tenant ? 'Plataforma Institucional' : 'NMF Soluciones Educativas'}</p>
			</div>
		</div>

		<!-- Login Card -->
		<div class="login-card">
			<div class="login-card-header">
				<h2>Bienvenido de vuelta</h2>
				<p>Ingresá con tu cuenta institucional</p>
			</div>

			{#if form?.error}
				<div class="alert-error" role="alert">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
					</svg>
					{form.error}
				</div>
			{/if}

			<form
				method="POST"
				action="?/login"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'redirect') {
							goto(result.location);
						} else {
							await update();
						}
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
							placeholder="tu@escuela.edu.ar"
							bind:value={email}
							required
							autocomplete="email"
						/>
					</div>
				</div>

				<div class="form-group">
					<label class="input-label" for="password">Contraseña</label>
					<div class="input-wrapper">
						<svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
						</svg>
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							class="input has-icon has-icon-right"
							placeholder="••••••••"
							bind:value={password}
							required
							autocomplete="current-password"
						/>
						<button
							type="button"
							class="input-icon-right"
							onclick={() => (showPassword = !showPassword)}
							aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						>
							{#if showPassword}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
									<line x1="1" y1="1" x2="23" y2="23"/>
								</svg>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<button type="submit" class="btn btn-primary btn-login" disabled={loading} id="btn-login">
					{#if loading}
						<span class="spinner"></span>
						Ingresando...
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
						</svg>
						Ingresar
					{/if}
				</button>
			</form>

			<p class="login-footer">
				¿Problemas para acceder? Contactá al administrador de tu institución.
			</p>
		</div>

		<p class="login-version">v0.1.0 — Sistema de Gestión Escolar</p>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		background: var(--bg-base);
	}
	.login-bg {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}
	.bg-orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.15;
	}
	.orb-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #6366f1, transparent);
		top: -100px;
		left: -100px;
	}
	.orb-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #8b5cf6, transparent);
		bottom: -80px;
		right: -80px;
	}
	.orb-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, #06b6d4, transparent);
		top: 50%;
		left: 60%;
	}

	.login-container {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 420px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		animation: slideUp var(--transition-slow) ease;
	}

	.login-brand {
		display: flex;
		align-items: center;
		gap: 0.875rem;
	}
	.brand-icon {
		filter: drop-shadow(0 0 16px rgba(99, 102, 241, 0.5));
	}
	.brand-name {
		font-size: 1.25rem;
		font-weight: 800;
		color: var(--text-primary);
		line-height: 1;
	}
	.brand-tagline {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: 0.2rem;
	}

	.login-card {
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-xl);
		padding: 2rem;
		box-shadow: var(--shadow-lg);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.login-card-header h2 {
		font-size: 1.375rem;
		font-weight: 800;
		color: var(--text-primary);
	}
	.login-card-header p {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.alert-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.25);
		border-radius: var(--radius-md);
		color: #fca5a5;
		font-size: 0.875rem;
	}

	.input-wrapper {
		position: relative;
	}
	.input-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-muted);
		pointer-events: none;
	}
	.input-icon-right {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		display: flex;
		transition: color var(--transition-fast);
	}
	.input-icon-right:hover { color: var(--text-secondary); }
	.input.has-icon { padding-left: 2.5rem; }
	.input.has-icon-right { padding-right: 2.5rem; }

	.btn-login {
		width: 100%;
		justify-content: center;
		padding: 0.75rem;
		font-size: 0.9375rem;
		margin-top: 0.25rem;
	}
	.btn-login:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.login-footer {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: center;
		line-height: 1.5;
	}

	.login-version {
		text-align: center;
		font-size: 0.7rem;
		color: var(--text-muted);
		opacity: 0.5;
	}
</style>
