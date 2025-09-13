'use strict'

import { expoOut } from 'svelte/easing'

// MEMO 'transition:' - both in and out, 'in:' - only render, 'out:' - only destroy
// <div class="project-row-wrapper" transition:popOutTransition="{{delay: 0, duration: 400}}">
export function popOutTransition(node, {delay = 0, duration = 400, easing = expoOut}) {
    return {
        delay,
        duration,
        easing,
        css: (t, u) => `transform: scale(${t}); opacity: ${t};`
    };
}

export function fadeTransition(node, {delay = 0, duration = 400, easing = expoOut}) {
    return {
        delay,
        duration,
        easing,
        css: (t, u) => `opacity: ${t};`
    };
}
