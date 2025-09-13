<script lang="ts">
	import { fade } from 'svelte/transition'

	import {
        LoadingStatus,
    } from '@lixpi/constants'

	import Spinner from '$src/components/spinner.svelte'
	import ProseMirror from '$src/components/proseMirror/ProseMirror.svelte'

	import { documentStore } from '$src//stores/documentStore.ts';
</script>

<div class="project-details" in:fade|global="{{ duration: 250 }}">
	{#if $documentStore.meta.loadingStatus === LoadingStatus.success}
		<ProseMirror
			isDisabled={false}
		/>
	{/if}

	{#if (![LoadingStatus.success, LoadingStatus.error].includes($documentStore.meta.loadingStatus))}
		<Spinner withOverlay />
	{/if}


	{#if $documentStore.meta.loadingStatus === LoadingStatus.error}
		<div class="error-overlay">
			<div>
				<h1>Error loading data</h1>
				<h3>{$documentStore.data.error}</h3>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	//NOTE Shared SASS variables available globally

	// TODO: temp solution, need a better error handling
	.error-overlay {
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
	}

	.project-details {
		margin: auto;
		height: 100%;
		background: #fff;
		position: relative;
	}

</style>
