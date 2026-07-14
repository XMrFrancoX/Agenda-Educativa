<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from '@lucide/svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let urlError = $derived($page.url.searchParams.get('error'));
	let displayError = $derived(
		form?.error ||
		(urlError === 'invalid_domain' ? 'Tu cuenta pertenece a otra institución. Verificá que estés en el link correcto.' : null)
	);

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
						<rect width="32" height="32" rx="10" fill="var(--color-primary, #0a3055)"/>
						<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
						<circle cx="24" cy="10" r="4" fill="var(--color-secondary, #fbb117)"/>
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

			{#if displayError}
				<Alert variant="destructive">
					<AlertCircle size={16} />
					<AlertDescription>{displayError}</AlertDescription>
				</Alert>
			{/if}

			<form
				method="POST"
				action="?/login"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'redirect') {
							goto(result.location, { invalidateAll: true });
						} else {
							await update();
						}
					};
				}}
			>
				<div class="form-group">
					<label class="input-label" for="email">Correo electrónico</label>
					<div class="input-wrapper">
						<Mail class="input-icon" size={16} />
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
						<Lock class="input-icon" size={16} />
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
								<EyeOff size={16} />
							{:else}
								<Eye size={16} />
							{/if}
						</button>
					</div>
					<div style="text-align: right; margin-top: 0.5rem;">
						<a href="/recuperar-password" class="forgot-password-link">¿Olvidaste tu contraseña?</a>
					</div>
				</div>

				<button type="submit" class="btn btn-primary btn-login" disabled={loading} id="btn-login">
					{#if loading}
						<span class="spinner"></span>
						Ingresando...
					{:else}
						<LogIn size={16} />
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
		opacity: 0.12;
	}
	.orb-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #0a3055, transparent);
		top: -100px;
		left: -100px;
	}
	.orb-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #f59d1e, transparent);
		bottom: -80px;
		right: -80px;
	}
	.orb-3 {
		width: 300px;
		height: 300px;
		background: radial-gradient(circle, #fbb117, transparent);
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
		filter: drop-shadow(0 0 16px light-dark(rgba(10, 48, 85, 0.3), rgba(245, 157, 30, 0.5)));
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
		color: var(--text-muted);
		font-size: 0.9375rem;
	}

	.forgot-password-link {
		font-size: 0.8125rem;
		color: var(--color-primary);
		text-decoration: none;
		font-weight: 500;
	}
	.forgot-password-link:hover {
		text-decoration: underline;
	}

	.input-wrapper {
		position: relative;
	}
	.input-wrapper :global(.input-icon) {
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
