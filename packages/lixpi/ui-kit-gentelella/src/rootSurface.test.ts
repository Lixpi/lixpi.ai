import {
    describe,
    expect,
    it,
} from 'vitest'

describe('Gentelella root browser surface', () => {
    it('loads without export collisions', async () => {
        const api = await import('./index.ts')

        expect(typeof api.createGentelellaApplicationShell).toBe('function')
        expect(typeof api.createGentelellaChart).toBe('function')
        expect(typeof api.createGentelellaDataTable).toBe('function')
        expect(typeof api.createGentelellaForm).toBe('function')
        expect(typeof api.createGentelellaWizard).toBe('function')
    })
})
