<script>
    import { fly, fade } from 'svelte/transition'
    import { expoOut } from 'svelte/easing'

    import {
        lixpiLogo,
        createNewFileIcon,
        logoutIcon
    } from '../../svgIcons'


    import routerService from '../../services/router-service'
    import DocumentService from '../../services/document-service.ts'


    import { routerStore } from '../../stores/routerStore.ts'
    import { documentsStore } from '../../stores/documentsStore.ts'
    import { documentStore } from '../../stores/documentStore.ts'
    import { aiModelsStore } from '../../stores/aiModelsStore.ts'

	import ProjectRow from './ProjectRow.svelte'

    // TODO: this is just a temp solution. I'm not sure how I want to approach setting default AI model, especially when there will be a multi-thread support in the documents.
    // I definitely don't want to bother to set it here
    let defaultAiModel = $derived($aiModelsStore.data.find(model => model.sortingPosition === 1))

    const handleProjectClick = key => {
        documentStore.setMetaValues({ isLoaded: false })

        routerService.navigateTo('project/:key', { params: { key } });
	}

    const handleCreateNewProjectClick = async () => {

        const projectService = DocumentService.getInstance('new')
        await projectService.createDocument({
            title: 'New project',
            aiModel: `${defaultAiModel.provider}:${defaultAiModel.model}`,
            content: {},
        })
    }

</script>

<aside class="flex flex-col items-center">
    <div class="top-nav w-full flex justify-between items-center">
        <div class="flex justify-between items-center">
            <!-- <img class="logo noselect" src="/system-images/logo.png" alt="Lixpi Lists" /> -->
            <div class="logo noselect">
                {@html lixpiLogo}
            </div>
            <span class="brand-name noselect">Lixpi</span> <!-- TODO: use original logo font as an svg -->
        </div>
        <div class="create-new-wrapper">
            <button class="create-new mr-1" onclick={handleCreateNewProjectClick}>
                {@html createNewFileIcon}
            </button>
            <!-- <ul>
                <li>Task</li>
                <li>List</li>
                <li>Project</li>
            </ul> -->
        </div>
    </div>
    <div class="projects auto-cols-auto overflow-auto">
        <!-- {#each $documentsStore.data as project} -->
        <!-- {#each reversedChatMessages as { item: message, index } (message.id)} -->
        {#each $documentsStore.data as project, index (project.documentId)} <!-- keyed loop allows the render animation inside the component to work properly -->
            <ProjectRow
                project={project}
                onClick={handleProjectClick}
                isActive={$routerStore.data.currentRoute.routeParams.key === project.documentId}
            />
        {/each}
    </div>
</aside>

<style lang="scss">
    //NOTE Shared SASS variables available globally

    @import "../../sass/_helpers";

    aside {
        background: $sidbarBackgroundColor;
        flex-grow: 0;
        margin: 0;
        z-index: 999;
        width: 100%;
        max-width: 230px;
        height: 100%;
        overflow: hidden;
        &, :global(a) {
            color: $sidebarTextColor;
        }
        :global(a) {
            text-decoration: none;
            font-weight: 400;
            &.selected {
                text-shadow: 1px 0px 0px #fff;    //TODO: what is it for? Could be a deprecated code
            }
        }
        .top-nav {
            padding: 1rem;
            position: sticky;;
            z-index: 99999;
            // &:after {
            //     content: '';
            //     position: absolute;
            //     bottom: 0;
            //     left: 0;
            //     width: 100%;
            //     height: 1px;
            //     background: $projectRowSeparatorLineFallbackColor;    // Fallback color, in case if gradient is not supported
            //     background: $projectRowSeparatorLineGradientColor;    // Gradient color, supported by modern browsers
            // }
        }
        .logo {
            height: auto;
            width: 32px;
            filter: $sidebarLogoFiler;
            :global(svg) {
                width: 100%;
                height: auto;
                fill: $nightBlue;
            }
        }
        .brand-name {
            font-size: 1.1rem;
            margin-left: .7rem;
        }
        .create-new-wrapper {
            position: relative;
            padding-right: 2em;
            margin-right: -2em;
            user-select: none;
            :global(*) {
                text-decoration: none;
            }
            ul {
                display: none;
                position: absolute;
                left: 100%;
                margin-left: -1.5em;
                top: 0;
                background: $darkPastelGreen;
                width: auto;
                z-index: 999999;
                box-sizing: border-box;
                padding: 0;
                font-size: .9em;
                border-radius: 4px;
                li {
                    white-space: nowrap;
                    line-height: 1;
                    padding: .5em 1.3em .5em .9em;
                    cursor: pointer;
                    text-transform: uppercase;
                    margin: 0;
                    &:first-of-type {
                        border-top-left-radius: 4px;
                        border-top-right-radius: 4px;
                        &:after {
                            right: 100%;
                            top: .9em;
                            border: solid transparent;
                            content: " ";
                            height: 0;
                            width: 0;
                            position: absolute;
                            pointer-events: none;
                            border-right-color: #55967c;
                            border-width: 7px;
                            margin-top: -7px;
                        }
                        &:hover {
                            &:after {
                                border-right-color: darken(#55967c, 7%);
                            }
                        }
                    }
                    &:last-of-type {
                        border-bottom-left-radius: 4px;
                        border-bottom-right-radius: 4px;
                    }
                    &:hover {
                        background: darken(#55967c, 7%);
                    }
                }
            }
            &:hover {
                ul {
                    display: block;
                }
            }
        }
        .create-new {
            // background: #55967c;
            background: transparent;
            // color: #fff;
            border: none;
            line-height: 1;
            // padding: .3em .47em;
            // border-radius: 4px;
            // font-size: .9em;
            // text-transform: uppercase;
            // letter-spacing: .02em;
            // box-shadow: 1px 3px 7px 0 rgb(0 0 0 / 15%);
            :global(svg) {
                width: 2.1em;
                height: 2.1em;
                fill: #fff;
                fill: $aiGreen;
                transition: hoverTransition(all, 170ms);
            }
            &:hover {
                cursor: pointer;
                // background: darken(#55967c, 7%);
                :global(svg) {
                    fill: darken($aiGreen, 3%);
                    // border: 1px solid red;
                    transform: scale(1.05);
                }
                + ul {
                    li {
                        &:first-of-type {
                            background: darken(#55967c, 7%);
                            &:after {
                                border-right-color: darken(#55967c, 7%);
                            }
                        }
                    }
                }
            }
        }
        .projects {
            max-height: calc(100vh - 73px);
            padding: 0;
            // border-top-right-radius: $sidebarProjectsScrollContainerBorderTopRightRadius;
            background: $sidebarProjectsScrollContainerBackgroundColor;
            :global(.project-row-wrapper.is-active + .project-row-wrapper .project-row:before) {    // Hide the project row separator for the project after the active project
                background: transparent;
            }
            :global(.project-row-wrapper:first-of-type .project-row:before) {    // Hide the project row separator for the first project
                background: transparent;
            }
        }
    }
</style>
