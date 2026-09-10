import {
    describe,
    expect,
    it,
} from 'vitest'

import {
    combineGentelellaClassNames,
    gentelellaBannerClassName,
    gentelellaButtonClassName,
    gentelellaSpinnerClassName,
    gentelellaStatusClassName,
    gentelellaTabClassName,
} from './classNames.ts'

describe('Gentelella class contracts', () => {
    it('combines component variants with caller classes', () => {
        expect(gentelellaBannerClassName({
            className: 'catalog-warning',
            variant: 'warning',
        })).toBe('banner banner-warning catalog-warning')
        expect(gentelellaButtonClassName({
            className: 'save-button',
            size: 'small',
            variant: 'primary',
        })).toBe('btn btn-primary btn-sm save-button')
        expect(gentelellaSpinnerClassName({ size: 'small' })).toBe('spinner spinner-sm')
        expect(gentelellaStatusClassName({ tone: 'green' })).toBe('status status-green')
        expect(gentelellaTabClassName(true, 'file-tab')).toBe('tab active file-tab')
    })

    it('drops empty class values without adding whitespace', () => {
        expect(combineGentelellaClassNames(
            'card',
            false,
            undefined,
            'catalog-card',
        )).toBe('card catalog-card')
    })
})
