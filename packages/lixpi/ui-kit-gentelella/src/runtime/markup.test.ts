import {
    describe,
    expect,
    it,
} from 'vitest'

import * as markup from './markup.ts'

describe('Gentelella markup facade', () => {
    it('exposes the upstream markup helpers through the package boundary', () => {
        expect(typeof markup.pageHeader).toBe('function')
        expect(typeof markup.statTile).toBe('function')
        expect(typeof markup.statusBadge).toBe('function')
        expect(typeof markup.emptyState).toBe('function')
    })
})
