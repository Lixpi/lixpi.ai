<script>
	/**
	 * @typedef {Object} Props
	 * @property {any} [avatar]
	 * @property {string} [name]
	 * @property {boolean} [isLightTheme]
	 * @property {string} [size]
	 * @property {boolean} [isInlineSvg]
	 * @property {string} [svgFillColor]
	 */

	/** @type {Props} */
	let {
		avatar = null,
		name = 'Undefined',
		isLightTheme = false,
		size = '23px',
		isInlineSvg = false,
		svgFillColor = 'orange',
		onclick = () => {}
	} = $props();
</script>

<span
	class="avatar {isLightTheme && 'light-theme'}"
	style="
		--avatarSize: {size};
		--shadowSize: {size};
		--svgFillColor: {svgFillColor};
	"
	{onclick}
>
	{#if avatar}
		{#if isInlineSvg}
			{@html avatar}
		{:else}
			<img src="{avatar}" alt="{name}" referrerpolicy="no-referrer"/>
		{/if}
	{:else}
		<span class="empty-avatar">{name.charAt(0)}</span>
	{/if}
</span>

<style lang="scss">
	//NOTE Shared SASS variables available globally

	span.avatar {
		display: block;
		width: var(--avatarSize);
		height: var(--avatarSize);
		border-radius: 99px;
		overflow: hidden;
		// margin-right: .4rem;
		box-shadow: 0 0 calc(var(--shadowSize)/2) 0 rgb(255 255 255 / 7%);
		user-select: none;
		cursor: pointer;
		img {
			width: 100%;
			height: 100%;
		}
		:global(svg) {
			width: 100%;
			height: 100%;
			fill: var(--svgFillColor);
		}
		span.empty-avatar {
			display: block;
			color: #262626;
			background: #fcfcfc;
			text-transform: uppercase;
			text-align: center;
			vertical-align: middle;
			line-height: var(--avatarSize);
		}
		&.light-theme {
			box-shadow: 0 0 calc(var(--shadowSize)/2) 0 rgb(0 0 0 / 7%);
			span.empty-avatar {
				color: #fcfcfc;
				background: #5c656d;
			}
		}
	}
</style>
