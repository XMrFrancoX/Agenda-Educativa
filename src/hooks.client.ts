import * as Sentry from '@sentry/sveltekit';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';

if (PUBLIC_SENTRY_DSN) {
	Sentry.init({
		dsn: PUBLIC_SENTRY_DSN,
		tracesSampleRate: 0.2
	});
}

// Si alguien tiene el sitio abierto en medio de un deploy nuevo, un chunk JS
// hasheado de la build vieja puede dejar de existir. Recargar en vez de dejarlo
// varado en una página rota.
window.addEventListener('vite:preloadError', () => {
	window.location.reload();
});

export const handleError = Sentry.handleErrorWithSentry();
