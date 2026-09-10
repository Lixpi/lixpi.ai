import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import { createGentelellaApplicationShell } from './applicationShell.ts'

afterEach(() => void document.body.replaceChildren())

describe('Gentelella application shell', () => {
    it('renders grouped navigation and delegates navigation without reloading', () => {
        const onNavigate = vi.fn()
        const shell = createGentelellaApplicationShell({
            brand: {
                mark: 'AI',
                name: 'Registry',
            },
            footerContent: 'Lixpi',
            navigationGroups: [{
                items: [{
                    label: 'Models',
                    path: '/models',
                }],
                label: 'Catalog',
            }],
            onNavigate,
        })
        document.body.append(shell.el)
        const link = shell.el.querySelector('a')!
        link.click()

        expect(onNavigate).toHaveBeenCalledWith(
            '/models',
            expect.any(MouseEvent),
        )
        expect(shell.el.querySelector('.brand-name')?.textContent).toBe('Registry')
        expect(shell.contentEl.parentElement?.classList.contains('main')).toBe(true)

        shell.setActivePath('/models')
        expect(link.classList.contains('active')).toBe(true)
        expect(link.getAttribute('aria-current')).toBe('page')

        shell.destroy()
        expect(document.body.children).toHaveLength(0)
    })
})
