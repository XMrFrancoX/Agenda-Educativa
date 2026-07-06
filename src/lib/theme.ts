export type Theme = 'light' | 'dark';

export function getInitialTheme(): Theme {
	if (typeof document !== 'undefined') {
		const attr = document.documentElement.getAttribute('data-theme');
		if (attr === 'light' || attr === 'dark') return attr;
	}
	return 'light';
}

export function applyTheme(theme: Theme) {
	document.documentElement.setAttribute('data-theme', theme);
	try {
		localStorage.setItem('theme', theme);
	} catch {
		// localStorage puede no estar disponible (modo privado, etc.)
	}
}
