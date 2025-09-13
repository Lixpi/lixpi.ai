<script>
    import { verticalTrippleDots } from '../../svgIcons'
    import { popOutTransition } from '../../constants/svelteAnimationTransitions';

    /**
     * @typedef {Object} Props
     * @property {any} [submenuState]
     * @property {any} toggleSubmenuHandler
     * @property {any} id
     * @property {string} [theme] - 'light' or 'dark
     * @property {any} [dropdownOptions]
     * @property {any} [buttonIcon]
     */

    /** @type {Props} */
    let {
        submenuState = $bindable({}),
        toggleSubmenuHandler,
        id,
        theme = 'light',
        dropdownOptions = [],
        buttonIcon = verticalTrippleDots
    } = $props();

    let submenuRef = $state()

    const onClickHandler = (e, id, onClick) => {
        submenuState[id] = false
        onClick(e, id)
    }

    const handleWindowClick = e => {
        // if (!e.composedPath().includes(submenuRef)) {
        //     submenuState[id] = false
        // }
    }
</script>

<svelte:window onclick={handleWindowClick}/>

<div class="dots-dropdown-menu-wrapper theme-{theme}">
    <span class="dots-dropdown-menu" class:is-active={submenuState[id]} onclick={(e) => { e.stopPropagation() }} bind:this={submenuRef}>
        <button class="flex justify-between items-center" onclick={(e)=> toggleSubmenuHandler(e, id)}>
            {@html buttonIcon}
        </button>
        {#if submenuState[id] && dropdownOptions.length > 0}
            <nav class="submenu-wrapper" in:popOutTransition|global={{duration: 300}} out:popOutTransition|global={{duration: 300}}>
                <ul class="submenu">
                    {#each dropdownOptions as option}
                        <li class="flex justify-between items-center" onclick={(e) => onClickHandler(e, id, option.onClick)}>{option.title}</li>
                    {/each}
                </ul>
            </nav>
        {/if}
    </span>
</div>

<style lang="scss"> //NOTE Shared SASS variables available globally

    @use 'sass:color';

    // Main structure without any specific colors. Colors are applied in the theme classes below
    .dots-dropdown-menu-wrapper {
        position: absolute;
        right: 0;
        top: -1px; //TODO what is it for?????
    }
    .dots-dropdown-menu {
        // display: none;
        position: relative;
        display: block;
        :global(svg) {
            height: 1.4rem;
            width: 1.4rem;
        }
        button {
            background: none;
            border: none;
            outline: none;
            cursor: pointer;
            padding: 0;
            text-align: center;
            border-radius: 99px;
            vertical-align: middle;
            width: 20px;
            height: 20px;;
            cursor: pointer;
            transition: background 70ms cubic-bezier(0.19, 1, 0.22, 1);
            &:before {
                content: "";
                display: block;
                width: 0px;
                height: 0px;
                border-radius: 99px;;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                transition: pupOutTransition(all, 300ms);
            }
            :global(svg) {
                margin: 0;
                padding: 0;
                transition: fill 70ms cubic-bezier(0.19, 1, 0.22, 1);
                position: relative;
                z-index: 9;
            }
            &:hover {
                &:before {
                    width: 100%;
                    height: 100%;
                }
            }
        }
        .submenu-wrapper {
            position: absolute;
            right: -5px;
            top: 33px;
            z-index: 999;
        }
        .submenu {
            // display: none;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            border-radius: 4px;
            margin: 0;
            user-select: none;
            &:before, &:after, li:first-of-type:after {
                content: "";
                position: absolute;
                right: 3px;
                transform: translateX(-50%);
                top: -.52rem;
                z-index: 99;
            }
            &:before {
                border-width: 0 8px 11px;
                border-style: solid;
                margin-top: -2px;
                right: -1px
            }
            &:after, li:first-of-type:after {
                border-width: 0 6px 9px;
                border-style: solid;
            }
            li:first-of-type:hover:after {
                z-index: 999;
            }

            li {
                margin: 0;
                padding: .4rem .7rem;
                vertical-align: middle;
                font-size: .9rem;
                text-transform: capitalize;
                cursor: pointer;
                transition: all 30ms cubic-bezier(0.19, 1, 0.22, 1);
                :global(svg) {
                    height: .8rem;
                    width: .8rem;
                    fill: #151515;
                    padding: 0;
                    margin: 0
                }
            }

        }
        &.is-active {
            button {
                // background: transparent;
                &:before {
                    width: 0;
                    height: 0;
                }
            }
            .submenu {
                display: block;
            }
            &:hover {
                button {
                    background: transparent;
                }
            }
        }
    }



    .theme-light {
        .dots-dropdown-menu {
            :global(svg) {
                fill: $dropdownLightThemeIconColor;
            }
            button {
                &:before {
                    background: $dropdownLightThemeIconBackgroundColorHover;
                }
                &:hover {
                    :global(svg) {
                        fill: $dropdownLightThemeIconColorHover;
                    }
                }
            }
            .submenu {
                background: $dropdownLightThemeSubmenuBackgroundColor;
                color: $dropdownLightThemeSubmenuTextColor;
                border: .06rem solid $dropdownLightThemeSubmenuBorderColor;
                box-shadow: $dropdownLightThemeSubmenuBoxShadow;
                &:before {
                    border-color: transparent transparent $dropdownLightThemeSubmenuBorderColor;
                }
                &:after, li:first-of-type:after {
                    border-color: transparent transparent $dropdownLightThemeSubmenuBackgroundColor;
                }
                li:first-of-type:hover:after {
                    border-color: transparent transparent color.adjust($dropdownLightThemeSubmenuBackgroundColor, $lightness: -6%);
                }

                li {
                    &:hover {
                        background: color.adjust($dropdownLightThemeSubmenuBackgroundColor, $lightness: -6%);
                    }
                    :global(svg) {
                        fill: #151515;
                    }
                }

            }
            &.is-active {
                button {
                    :global(svg) {
                        fill: $dropdownLightThemeIconColorActive;
                    }
                    &:hover {
                        background: $dropdownLightThemeIconBackgroundColorActiveHover;
                        :global(svg) {
                            fill: $dropdownLightThemeIconColorActive;
                        }
                    }
                }
            }
        }
    }

    .theme-dark {
        .dots-dropdown-menu {
            :global(svg) {
                fill: $dropdownDarkThemeIconColor;
            }
            button {
                &:before {
                    background: $dropdownDarkThemeIconBackgroundColorHover;
                }
                &:hover {
                    :global(svg) {
                        fill: $dropdownDarkThemeIconColorHover;
                    }
                }
            }
            .submenu {
                background: $dropdownDarkThemeSubmenuBackgroundColor;
                color: $dropdownDarkThemeSubmenuTextColor;
                border: .06rem solid $dropdownDarkThemeSubmenuBorderColor;
                box-shadow: $dropdownDarkThemeSubmenuBoxShadow;
                &:before {
                    border-color: transparent transparent $dropdownDarkThemeSubmenuBorderColor;
                }
                &:after, li:first-of-type:after {
                    border-color: transparent transparent $dropdownDarkThemeSubmenuBackgroundColor;
                }
                li:first-of-type:hover:after {
                    border-color: transparent transparent color.adjust($dropdownDarkThemeSubmenuBackgroundColor, $lightness: -6%);
                }

                li {
                    &:hover {
                        background: color.adjust($dropdownDarkThemeSubmenuBackgroundColor, $lightness: -6%);
                    }
                    :global(svg) {
                        fill: #151515;
                    }
                }
            }
            &.is-active {
                button {
                    :global(svg) {
                        fill: $dropdownDarkThemeIconColorActive;
                    }
                    &:hover {
                        background: $dropdownDarkThemeIconBackgroundColorActiveHover;
                        :global(svg) {
                            fill: $dropdownDarkThemeIconColorActive;
                        }
                    }
                }
            }
        }
    }

</style>
