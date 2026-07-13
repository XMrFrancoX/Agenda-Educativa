<script lang="ts">
	let {
		name,
		options,
		placeholder = 'Buscar...',
		required = false,
		value = $bindable('')
	}: {
		name: string;
		options: { id: string; label: string; sublabel?: string }[];
		placeholder?: string;
		required?: boolean;
		value?: string;
	} = $props();

	let query = $state('');
	let open = $state(false);
	let inputEl: HTMLInputElement;

	let filtered = $derived(
		query.trim()
			? options.filter((o) => (o.label + ' ' + (o.sublabel ?? '')).toLowerCase().includes(query.trim().toLowerCase()))
			: options
	);

	function select(option: { id: string; label: string }) {
		value = option.id;
		query = option.label;
		open = false;
	}

	function clear() {
		value = '';
		query = '';
		inputEl?.focus();
		open = true;
	}

	function handleBlur() {
		// Delay para permitir que el click en una opción se registre antes de cerrar.
		setTimeout(() => (open = false), 150);
	}
</script>

<div class="searchable-select">
	<input type="hidden" {name} {value} {required} />
	<div class="ss-input-wrapper">
		<input
			bind:this={inputEl}
			type="text"
			class="input"
			{placeholder}
			bind:value={query}
			onfocus={() => (open = true)}
			onblur={handleBlur}
			autocomplete="off"
		/>
		{#if value}
			<button type="button" class="ss-clear" onclick={clear} aria-label="Limpiar selección">×</button>
		{/if}
	</div>
	{#if open && filtered.length > 0}
		<ul class="ss-dropdown">
			{#each filtered as option}
				<li>
					<button type="button" class="ss-option" onclick={() => select(option)}>
						{option.label}
						{#if option.sublabel}<span class="ss-sublabel">{option.sublabel}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{:else if open && query.trim()}
		<ul class="ss-dropdown">
			<li class="ss-empty">Sin resultados.</li>
		</ul>
	{/if}
</div>

<style>
	.searchable-select {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	.ss-input-wrapper {
		position: relative;
	}
	.ss-clear {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		padding: 0.2rem;
	}
	.ss-clear:hover { color: var(--text-secondary); }
	.ss-dropdown {
		position: absolute;
		z-index: 30;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		max-height: 220px;
		overflow-y: auto;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		list-style: none;
		padding: 0.25rem;
	}
	.ss-option {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		text-align: left;
		padding: 0.4rem 0.6rem;
		border-radius: var(--radius-sm);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.8125rem;
		color: var(--text-primary);
	}
	.ss-option:hover { background: var(--bg-overlay); }
	.ss-sublabel {
		font-size: 0.7rem;
		color: var(--text-muted);
	}
	.ss-empty {
		padding: 0.5rem 0.6rem;
		font-size: 0.8125rem;
		color: var(--text-muted);
		font-style: italic;
	}
</style>
