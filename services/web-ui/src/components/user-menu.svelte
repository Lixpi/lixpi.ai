<script>
    import { popOutTransition } from '../constants/svelteAnimationTransitions';

    import {
        logoutIcon
    } from '../svgIcons'

    import { authStore } from '../stores/authStore.ts'

    import AuthService from '../services/auth0-service'

    import UserAvatar from './user-avatar.svelte'

    /**
     * @typedef {Object} Props
     * @property {string} [theme]
     */

    /** @type {Props} */
    let { theme = 'light' } = $props();

    let userMenuRef = $state()
    let isUserMenuOpen = $state(false)

    const submenuItems = [
        {
            title: 'Logout',
            icon: logoutIcon,
            onClick: e => {
                e.preventDefault()
                AuthService.logout()
            }
        }
    ]

    const toggleUserMenu = (e, id) => {
        e.stopPropagation()
        isUserMenuOpen = !isUserMenuOpen
    }

    const submenuItemOnclickHandler = (e, onClick) => {
        onClick(e)
    }

    const handleWindowClick = e => {
        if (!e.composedPath().includes(userMenuRef)) {
            isUserMenuOpen = false
        }
    }
</script>

<svelte:window onclick={handleWindowClick}/>

<div class="user-menu-wrapper theme-{theme}">
    <span class="user-menu" class:is-active={isUserMenuOpen} onclick={(e) => { e.stopPropagation() }} bind:this={userMenuRef}>

        <button class="d-flex justify-content-between align-items-center" onclick={(e)=> toggleUserMenu(e)}>
            <UserAvatar
                avatar={$authStore.data.user?.picture}
                name={$authStore.data.user?.given_name || 'User'}
                isLightTheme={true}
                size="25px"
            />
        </button>
        {#if isUserMenuOpen}
            <nav class="user-submenu-wrapper" in:popOutTransition|global={{duration: 300}} out:popOutTransition|global={{duration: 300}}>
                <ul class="submenu">
                    {#each submenuItems as submenuItem}
                        <li class="d-flex justify-content-start align-items-center" onclick={(e) => submenuItemOnclickHandler(e, submenuItem.onClick)}>
                            {#if submenuItem.icon}
                                {@html submenuItem.icon}
                                <!-- {@html injectFillColor(submenuItem.icon, submenuItem.iconColor)} -->
                            {/if}
                            {submenuItem.title}
                        </li>
                    {/each}
                </ul>
            </nav>
        {/if}
    </span>
</div>

<style lang="scss"> //NOTE Shared SASS variables available globally


    // Main structure without any specific colors. Colors are applied in the theme classes below
    .user-menu-wrapper {
        position: absolute;
        right: 0;
        top: 5px
    }
    .user-menu {
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
            vertical-align: middle;
            width: auto;
            cursor: pointer;
            transition: background 70ms cubic-bezier(0.19, 1, 0.22, 1);
            padding: 3px;
            span {
                z-index: 9;
                // background: transparent;
                position: relative;

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
        }
        .user-submenu-wrapper {
            position: absolute;
            right: 1px;
            top: 47px;
            z-index: 999;
        }
        .submenu {
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


    .theme-light {
        .user-menu {
            :global(svg) {
                fill: $dropdownSubmenuColorLightTheme;
            }
            .submenu {
                background: $dropdownSubmenuColorLightTheme;
                color: $dropdownColorLightTheme;
                border: .06rem solid darken($dropdownSubmenuColorLightTheme, 10%);
                &:before {
                    border-color: transparent transparent darken($dropdownSubmenuColorLightTheme, 10%);
                }
                &:after, li:first-of-type:after {
                    border-color: transparent transparent $dropdownSubmenuColorLightTheme;
                }
                li:first-of-type:hover:after {
                    border-color: transparent transparent darken($dropdownSubmenuColorLightTheme, 6%);
                }

                li {
                    &:hover {
                        background: darken($dropdownSubmenuColorLightTheme, 6%);
                    }
                    :global(svg) {
                        fill: #151515;
                    }
                }

            }
            &.is-active {
            }
        }
    }



    $dropdownSubmenuColorDarkTheme: $steelBlue;
    $dropdownColorDarkTheme: $offWhite;

    .theme-dark {
        .user-menu {
            :global(svg) {
                fill: $dropdownSubmenuColorDarkTheme;
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
                }
            }
            .submenu {
                background: $dropdownSubmenuColorDarkTheme;
                color: $dropdownColorDarkTheme;
                border: .06rem solid darken($dropdownSubmenuColorDarkTheme, 10%);
                &:before {
                    border-color: transparent transparent darken($dropdownSubmenuColorDarkTheme, 10%);
                }
                &:after, li:first-of-type:after {
                    border-color: transparent transparent $dropdownSubmenuColorDarkTheme;
                }
                li:first-of-type:hover:after {
                    border-color: transparent transparent darken($dropdownSubmenuColorDarkTheme, 6%);
                }

                li {
                    &:hover {
                        background: darken($dropdownSubmenuColorDarkTheme, 6%);
                    }
                    :global(svg) {
                        fill: $offWhite;
                    }
                }

            }
        }
    }

</style>
