<script lang="ts">
	import { goto } from '$app/navigation';
	import { createSupabaseBrowserClient } from '$lib/supabase';
	import { onMount } from 'svelte';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
	import { AlertCircle, CheckCircle2 } from '@lucide/svelte';

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMsg = $state<string | null>(null);
	let success = $state(false);

	const supabase = createSupabaseBrowserClient();

	onMount(async () => {
		const url = new URL(window.location.href);
		const code = url.searchParams.get('code');

		if (code) {
			const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
			if (exchangeError) {
				errorMsg = "El enlace de recuperación es inválido o ha expirado. Por favor, solicita uno nuevo.";
				return;
			}
			url.searchParams.delete('code');
			window.history.replaceState({}, '', url.toString());
		}

		// Manejo manual del Hash (Implicit Flow) en caso de que el cliente ignore PKCE por defecto
		const hash = window.location.hash;
		if (hash && hash.includes('access_token=')) {
			const params = new URLSearchParams(hash.substring(1)); // remover el '#'
			const access_token = params.get('access_token');
			const refresh_token = params.get('refresh_token');
			
			if (access_token && refresh_token) {
				const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });
				if (setSessionError) {
					errorMsg = "El enlace de recuperación es inválido o ha expirado.";
					return;
				}
				window.location.hash = '';
			}
		}

		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
				errorMsg = null;
			}
		});

		// Nos desuscribimos al desmontar
		return () => subscription.unsubscribe();
	});

	async function handleUpdate(e: Event) {
		e.preventDefault();
		errorMsg = null;

		if (password.length < 6) {
			errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
			return;
		}
		if (password !== confirmPassword) {
			errorMsg = 'Las contraseñas no coinciden.';
			return;
		}

		loading = true;
		const { data: { session } } = await supabase.auth.getSession();
		
		if (!session) {
			loading = false;
			errorMsg = 'No estás autenticado. El enlace ya fue usado o caducó. Por favor, solicita uno nuevo.';
			return;
		}

		const { error } = await supabase.auth.updateUser({ password });
		loading = false;

		if (error) {
			errorMsg = 'No se pudo actualizar la contraseña. Verifica que el enlace no haya expirado.';
			console.error(error);
		} else {
			success = true;
			setTimeout(() => {
				window.location.href = '/calendario';
			}, 2000);
		}
	}
</script>

<svelte:head>
	<title>Actualizar Contraseña — Agenda Educativa</title>
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
					<rect width="32" height="32" rx="10" fill="var(--color-primary, #0a3055)"/>
					<path d="M8 12h16M8 16h10M8 20h13" stroke="white" stroke-width="2" stroke-linecap="round"/>
					<circle cx="24" cy="10" r="4" fill="var(--color-secondary, #fbb117)"/>
				</svg>
			</div>
			<div>
				<h1 class="brand-name">Agenda Educativa</h1>
				<p class="brand-tagline">Seguridad</p>
			</div>
		</div>

		<div class="login-card">
			<div class="login-card-header">
				<h2>Actualizar contraseña</h2>
				<p>Crea una nueva contraseña segura para tu cuenta.</p>
			</div>

			{#if errorMsg}
				<Alert variant="destructive">
					<AlertCircle size={16} />
					<AlertDescription>{errorMsg}</AlertDescription>
				</Alert>
				{#if errorMsg.includes("inválido o ha expirado")}
					<div style="text-align: center; margin-top: 1rem;">
						<a href="/recuperar-password" class="btn btn-primary btn-login" style="text-decoration: none;">Solicitar nuevo enlace</a>
					</div>
				{/if}
			{:else if success}
				<Alert variant="success">
					<CheckCircle2 size={16} />
					<AlertTitle>¡Contraseña actualizada!</AlertTitle>
					<AlertDescription>Redirigiendo a tu cuenta...</AlertDescription>
				</Alert>
			{/if}

			{#if !success && (!errorMsg || !errorMsg.includes("inválido o ha expirado"))}
				<form onsubmit={handleUpdate}>
					<div class="form-group" style="margin-bottom: 1rem;">
						<label class="input-label" for="password">Nueva contraseña</label>
						<div class="input-wrapper">
							<svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
							</svg>
							<input
								id="password"
								type="password"
								class="input has-icon"
								placeholder="Mínimo 6 caracteres"
								bind:value={password}
								required
								minlength="6"
							/>
						</div>
					</div>

					<div class="form-group" style="margin-bottom: 1.5rem;">
						<label class="input-label" for="confirmPassword">Confirmar contraseña</label>
						<div class="input-wrapper">
							<svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
							</svg>
							<input
								id="confirmPassword"
								type="password"
								class="input has-icon"
								placeholder="Vuelve a escribir la contraseña"
								bind:value={confirmPassword}
								required
								minlength="6"
							/>
						</div>
					</div>

					<button type="submit" class="btn btn-primary btn-login" disabled={loading}>
						{#if loading}
							<span class="spinner"></span>
							Guardando...
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
							</svg>
							Guardar contraseña
						{/if}
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Estilos idénticos al login */
	.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: var(--bg-base); }
	.login-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
	.bg-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.12; }
	.orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, #0a3055, transparent); top: -100px; left: -100px; }
	.orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, #f59d1e, transparent); bottom: -80px; right: -80px; }
	.orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, #fbb117, transparent); top: 50%; left: 60%; }

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
