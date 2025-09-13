<script lang="ts">
	import { fade } from 'svelte/transition'

	interface Props {
		withOverlay?: boolean,    // Show overlay behind spinner.
		fadeDuration?: number,    // Duration of fade in/out animation in milliseconds.
		extendOverlayBeyondParentContentBox?: number,    // Extend overlay beyond parent content box by this many pixels. Useful for overlaying content that has no padding or margin, which otherwise would look ugly.
	}

	let {
		withOverlay = false,
		extendOverlayBeyondParentContentBox = 0,
		fadeDuration = 0,
	}: Props = $props()

</script>

{#if withOverlay}
	<div
		class="preloader-overlay {extendOverlayBeyondParentContentBox ? 'extend-overlay-outside' : ''}"
		style="
			--extendOverlayBeyondParentContentBox: {extendOverlayBeyondParentContentBox};
		"
	>
		<span class="loader" in:fade|global="{{ duration: fadeDuration }}"></span>
	</div>
{:else}
	<span class="loader" in:fade|global="{{ duration: fadeDuration }}"></span>
{/if}


<style lang="scss">
	//NOTE Shared SASS variables available globally

	.preloader-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 999;
		display: flex;
		justify-content: center;
		align-items: center;
		backdrop-filter: blur(8px);
		transition: opacity 0.3s;

		&.extend-overlay-outside {
			top: calc(var(--extendOverlayBeyondParentContentBox) * -1px);
			bottom: calc(var(--extendOverlayBeyondParentContentBox) * -1px);
			left: calc(var(--extendOverlayBeyondParentContentBox) * -1px);
			right: calc(var(--extendOverlayBeyondParentContentBox) * -1px);
			height: auto;
			width: auto;
		}
	}
	.loader {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		display: inline-block;
		border-top: 5px solid $nightBlue;
		border-right: 5px solid transparent;
		box-sizing: border-box;
		animation: rotation 1500ms linear infinite;

		&::after {
			content: '';
			box-sizing: border-box;
			position: absolute;
			left: 0;
			top: 0;
			width: 60px;
			height: 60px;
			border-radius: 50%;
			border-left: 5px solid $redPink;
			border-bottom: 5px solid transparent;
			animation: rotation 500ms linear infinite reverse;
		}
	}
	@keyframes rotation {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
