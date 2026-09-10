// @vitest-environment node
import {
    readdirSync,
    readFileSync,
} from 'node:fs'
import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    GENTELELLA_CHART_TYPES,
    GENTELELLA_COMPONENT_SOURCE_PAGES,
    GENTELELLA_STYLE_MODULES,
    GENTELELLA_THEME_TOKENS,
} from './inventory.ts'
import { GENTELELLA_RUNTIME_MODULES } from './runtime/modules.ts'

const packageRoot = new URL('../', import.meta.url)
const upstreamRoot = new URL('node_modules/gentelella/', packageRoot)

describe('Gentelella upstream coverage', () => {
    it('tracks every shipped v4 runtime module', () => {
        const upstreamModules = readdirSync(new URL('src/v4/', upstreamRoot))
            .filter(fileName => fileName.endsWith('.js'))
            .map(fileName => fileName.replace(/\.js$/, ''))
            .sort()
        const trackedModules = Object.keys(GENTELELLA_RUNTIME_MODULES).sort()

        expect(trackedModules).toEqual(upstreamModules)
    })

    it('tracks every shipped v4 Sass module', () => {
        const upstreamModules = readdirSync(new URL('src/scss/v4/', upstreamRoot))
            .filter(fileName => /^_[a-z-]+\.scss$/.test(fileName))
            .map(fileName => fileName.replace(/^_/, '').replace(/\.scss$/, ''))
            .sort()

        expect([...GENTELELLA_STYLE_MODULES].sort()).toEqual(upstreamModules)
    })

    it('tracks every theme custom property', () => {
        const source = readFileSync(new URL('src/scss/v4/_tokens.scss', upstreamRoot), 'utf8')
        const tokens = new Set(
            [...source.matchAll(/^\s*(--[a-z0-9-]+):/gmu)].map(match => match[1]),
        )

        expect([...GENTELELLA_THEME_TOKENS].sort()).toEqual([...tokens].sort())
    })

    it('uses every production demo as a component coverage fixture', () => {
        const upstreamPages = readdirSync(new URL('production/', upstreamRoot))
            .filter(fileName => fileName.endsWith('.html'))
            .sort()

        expect([...GENTELELLA_COMPONENT_SOURCE_PAGES].sort()).toEqual(upstreamPages)
    })

    it('tracks every concrete chart used by the production demos', () => {
        const chartTypes = new Set<string>()

        for (const page of GENTELELLA_COMPONENT_SOURCE_PAGES) {
            const source = readFileSync(new URL(`production/${page}`, upstreamRoot), 'utf8')

            for (const match of source.matchAll(/data-chart=["']([^"']+)["']/g)) {
                if (match[1] !== '…')
                    chartTypes.add(match[1])
            }
        }

        expect([...GENTELELLA_CHART_TYPES].sort()).toEqual([...chartTypes].sort())
    })
})
