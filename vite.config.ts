import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	// Puerto fijo para poder correr esto y Landing Page (5173) en paralelo
	// sin que uno le pise el puerto al otro.
	server: {
		port: 5174,
		strictPort: true
	}
});
