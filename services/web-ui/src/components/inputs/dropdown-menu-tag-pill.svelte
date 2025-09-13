<script>
    import { popOutTransition } from '../../constants/svelteAnimationTransitions';

    import {
        verticalTrippleDots,
        chevronDownIcon,
        chevronUpIcon,
    } from '../../svgIcons'

    /**
     * @typedef {Object} Props
     * @property {any} [selectedValue]
     * @property {any} [submenuState]
     * @property {any} toggleSubmenuHandler
     * @property {any} id
     * @property {string} [theme]
     * @property {string} [renderPosition]
     * @property {any} [dropdownOptions]
     * @property {any} [buttonIcon]
     */

    /** @type {Props} */
    let {
        selectedValue = {},
        submenuState = $bindable({}),
        toggleSubmenuHandler,
        id,
        theme = 'light',
        renderPosition = 'bottom',
        dropdownOptions = [],
        buttonIcon = chevronDownIcon
    } = $props();

    let submenuRef = $state()

    $effect(() => {
        // console.log('submenuState', selectedValue)
    });

const onClickHandler = (e, id, onClick) => {
    submenuState[id] = false
    console.log('onClickHandler', {id, onClick})
    onClick(e, id)
}

const handleWindowClick = e => {
    if (!e.composedPath().includes(submenuRef)) {
        submenuState[id] = false
    }
}

const injectFillColor = (svg, color) => {
    if (!svg || !color) {
        return false
    }
    const svgWithColor = svg.replace(/<svg([\s\S]*?)>/, `<svg$1 style="fill: ${color}">`);
    return svgWithColor;
};
</script>

<svelte:window onclick={handleWindowClick}/>

<div class="dropdown-menu-tag-pill-wrapper theme-{theme}">
    <span class="dots-dropdown-menu" class:is-active={submenuState[id]} onclick={(e) => { e.stopPropagation() }} bind:this={submenuRef}>
        <button class="flex justify-between items-center" onclick={(e)=> toggleSubmenuHandler(e, id)}>
            <span class="selected-option-icon flex items-center">
                <!-- {@html selectedValue?.icon } -->
                {@html injectFillColor(selectedValue?.icon, selectedValue?.color)}
            </span>
            <span class="title">{selectedValue?.title}</span>
            <span class="state-indicator flex items-center">
                {@html buttonIcon}
            </span>
        </button>
        {#if submenuState[id] && dropdownOptions.length > 0}
            <nav
                class="submenu-wrapper render-position-{renderPosition}"
                in:popOutTransition|global={{duration: 300}}
                out:popOutTransition|global={{duration: 300}}
            >
                <ul class="submenu">
                    {#each dropdownOptions as option}
                        <li class="flex justify-start items-center" onclick={(e) => onClickHandler(e, id, option.onClick)}>
                            {#if option.icon}
                                {@html option.icon}
                                <!-- {@html injectFillColor(option.icon, option.iconColor)} -->
                            {/if}
                            {option.title}
                        </li>
                    {/each}
                </ul>
            </nav>
        {/if}
    </span>
</div>

<style lang="scss"> //NOTE Shared SASS variables available globally

    @use "sass:color";


    // Main structure without any specific colors. Colors are applied in the theme classes below
    .dropdown-menu-tag-pill-wrapper {
        position: absolute;
        right: 0;
        top: -1px; //TODO fucking hack to position it in the prosemirror menubar, completely temporary, must be moved to the prosemirror document itself
    }
    .dots-dropdown-menu {
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
            border-radius: 3px;
            vertical-align: middle;
            height: 23px;
            width: auto;
            cursor: pointer;
            transition: background 70ms cubic-bezier(0.19, 1, 0.22, 1);


            padding: 0.2rem 0.3rem;
            border-radius: 4px;
            font-size: 1rem;
            font-weight: 500;
            white-space: nowrap;

            &:before {
                content: "";
                display: block;
                width: 0px;
                height: 0px;
                // border-radius: 99px;
                border-radius: 4px;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                transition: pupOutTransition(all, 130ms);
            }
            span {
                z-index: 9;
                // background: transparent;
                position: relative;
                &.selected-option-icon {
                    :global(svg) {
                        margin: 0 .4rem 0 .2rem;
                        width: 16px;
                        height: 16px;
                    }
                }
                &.title {
                    font-weight: 500;
                    // color: #000;
                }
                &.state-indicator :global(svg) {
                    // margin: 0 0 0 .2rem;
                    margin: 0;
                    padding: 0;
                    transition: fill 70ms cubic-bezier(0.19, 1, 0.22, 1);
                    position: relative;
                    z-index: 9;
                }
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
            right: 1px;
            // top: 37px;
            // bottom: 37px;
            z-index: 999;
            &.render-position-top {
                bottom: 37px;
                // bottom: auto;
            }
            &.render-position-bottom {
                // top: auto;

                top: 37px;
            }
        }
        .submenu {
            // display: none;
            width: 100%;
            white-space: nowrap;
            overflow: hidden;
            border-radius: 4px;
            margin: 0;
            box-shadow: .05rem .05rem 7px 0px rgba(0,0,0,.5);
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
                padding: .4rem .7rem .4rem .4rem;
                vertical-align: middle;
                font-size: .9rem;
                text-transform: capitalize;
                cursor: pointer;
                transition: all 30ms cubic-bezier(0.19, 1, 0.22, 1);
                :global(svg) {
                    height: .8rem;
                    width: .8rem;
                    // fill: #151515;
                    padding: 0;
                    margin: 0 .4rem 0 0;
                }
            }

        }
        &.is-active {
            button {
                // background: transparent;
                &:before {
                    width: 0;
                    height: 0;
                    width: 100%;
                    height: 100%;
                }
            }
            .submenu {
                display: block;
            }
            &:hover {
                button {
                    // background: transparent;
                }
            }
        }
    }



    $dropdownSubmenuColorLightTheme: $offWhite;
    $dropdownColorLightTheme: $nightBlue;



    // $dropdownSubmenuColorLightTheme: $offWhite;
    // $dropdownColorLightTheme: $nightBlue;

    // $dropdownSubmenuColorDarkTheme: $steelBlue;
    // $dropdownColorDarkTheme: $offWhite;



    .theme-light {
        .dots-dropdown-menu {
            :global(svg) {
                fill: $dropdownSubmenuColorLightTheme;
            }
            button {
                &:before {
                    background: $dropdownSubmenuColorLightTheme;
                }
                &:hover {
                    :global(svg) {
                        fill: $dropdownColorLightTheme;
                    }
                }
            }
            .submenu {
                background: $dropdownSubmenuColorLightTheme;
                color: $dropdownColorLightTheme;
                border: .06rem solid color.adjust($dropdownSubmenuColorLightTheme, $lightness: -10%);
                &:before {
                    border-color: transparent transparent color.adjust($dropdownSubmenuColorLightTheme, $lightness: -10%);
                }
                &:after, li:first-of-type:after {
                    border-color: transparent transparent $dropdownSubmenuColorLightTheme;
                }
                li:first-of-type:hover:after {
                    border-color: transparent transparent color.adjust($dropdownSubmenuColorLightTheme, $lightness: -6%);
                }

                li {
                    &:hover {
                        background: color.adjust($dropdownSubmenuColorLightTheme, $lightness: -6%);
                    }
                    :global(svg) {
                        fill: #151515;
                    }
                }

            }
            &.is-active {
                button {
                    :global(svg) {
                        fill: $dropdownSubmenuColorLightTheme;
                    }
                    &:hover {
                        background: $dropdownSubmenuColorLightTheme;
                        :global(svg) {
                            fill: $dropdownSubmenuColorLightTheme;
                        }
                    }
                    &:before {
                        background: $dropdownSubmenuColorLightTheme;
                    }
                }
            }
        }
    }



    $dropdownSubmenuColorDarkTheme: $steelBlue;
    $dropdownColorDarkTheme: $offWhite;

    .theme-dark {
        .dots-dropdown-menu {
            :global(svg) {
                fill: $dropdownSubmenuColorDarkTheme;
            }
            button {
                // background: darken($dropdownColorDarkTheme, 7%);
                // border: 1px solid $dropdownSubmenuColorDarkTheme;
                // box-shadow: inset 0 0 0px 1px rgba(0, 0, 0, 0.1), 0 0 2px 0px rgba(0, 0, 0, 0.1);
                &:before {
                    background: $dropdownColorDarkTheme;

                }
                &:hover {
                    // background: transparent;
                    transition: hoverTransition(all, 30ms);
                    box-shadow: none;
                    // box-shadow: inset 0 0 0px 1px rgba(0, 0, 0, 0.1), 0 0 2px 0px rgba(0, 0, 0, 0.1);
                    span.state-indicator :global(svg) {
                        transition: hoverTransition(all, 300ms);
                        // fill: $dropdownColorDarkTheme;
                    }
                }
                span {
                    &.selected-option-icon :global(svg) {
                        // fill: $aiGreen;
                    }
                }
            }
            &.is-active {
                button {
                    box-shadow: none;
                    span.state-indicator :global(svg) {
                        fill: $dropdownSubmenuColorDarkTheme;
                        transform: scale(-1, -1);

                    }
                    &:hover {
                        background: $dropdownColorDarkTheme;
                        span.state-indicator :global(svg) {
                            fill: $dropdownSubmenuColorDarkTheme;
                        }
                    }
                    &:before {
                        // background: transparent;
                        // background: pink;
                        background: $dropdownColorDarkTheme;
                    }
                }
            }
            .submenu {
                background: $dropdownSubmenuColorDarkTheme;
                color: $dropdownColorDarkTheme;
                border: .06rem solid color.adjust($dropdownSubmenuColorDarkTheme, $lightness: -10%);
                &:before {
                    border-color: transparent transparent color.adjust($dropdownSubmenuColorDarkTheme, $lightness: -10%);
                }
                &:after, li:first-of-type:after {
                    border-color: transparent transparent $dropdownSubmenuColorDarkTheme;
                }
                li:first-of-type:hover:after {
                    border-color: transparent transparent color.adjust($dropdownSubmenuColorDarkTheme, $lightness: -6%);
                }

                li {
                    &:hover {
                        background: color.adjust($dropdownSubmenuColorDarkTheme, $lightness: -6%);
                    }
                    :global(svg) {
                        fill: $offWhite;
                    }
                }

            }
        }
    }

</style>
