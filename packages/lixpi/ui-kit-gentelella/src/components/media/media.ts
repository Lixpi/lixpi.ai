import { ICONS } from '../../runtime/shell-render.ts'
import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    type GentelellaContent,
} from '../../content.ts'

export const GENTELELLA_ICONS = ICONS

export type GentelellaIconName = keyof typeof GENTELELLA_ICONS

export type GentelellaIconConfig = {
    className?: string
    document?: Document
    label?: string
    name: GentelellaIconName
}

export const createGentelellaIcon = (config: GentelellaIconConfig): GentelellaComponentInstance<HTMLSpanElement> => {
    const element = createGentelellaElement(
        'span',
        'icon',
        {
            attributes: {
                'aria-hidden': config.label ? undefined : true,
                'aria-label': config.label,
                role: config.label ? 'img' : undefined,
            },
            className: config.className,
            document: config.document,
            trustedInnerHtml: GENTELELLA_ICONS[config.name] ?? '',
        },
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaMediaTileConfig = {
    badge?: GentelellaContent
    className?: string
    document?: Document
    id: string
    imageAlt: string
    imageSrc: string
    metadata?: string
    onSelect?: (
        id: string,
        event: MouseEvent,
    ) => void
    title: string
}

export const createGentelellaMediaTile = (config: GentelellaMediaTileConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'article',
        'media-tile',
        {
            attributes: {
                'data-id': config.id,
                tabindex: 0,
            },
            className: config.className,
            document,
        },
    )
    const image = createGentelellaElement(
        'img',
        'gallery-image',
        { document },
    )
    image.alt = config.imageAlt
    image.loading = 'lazy'
    image.src = config.imageSrc
    element.append(image)

    if (config.badge)
        element.append(
            createGentelellaElement(
                'span',
                'gallery-badge',
                {
                    content: config.badge,
                    document,
                },
            ),
        )

    element.append(
        createGentelellaElement(
            'div',
            'title',
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.metadata)
        element.append(
            createGentelellaElement(
                'div',
                'meta',
                {
                    content: config.metadata,
                    document,
                },
            ),
        )

    element.addEventListener('click', event => config.onSelect?.(config.id, event))

    return createGentelellaComponentInstance(element)
}

export type GentelellaIconCatalogConfig = {
    className?: string
    document?: Document
    names?: GentelellaIconName[]
    onSelect?: (name: GentelellaIconName) => void
}

export const createGentelellaIconCatalog = (config: GentelellaIconCatalogConfig = {}): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'icon-grid',
        {
            className: config.className,
            document,
        },
    )

    for (const name of config.names ?? Object.keys(GENTELELLA_ICONS)) {
        const button = createGentelellaElement(
            'button',
            'icon-cell',
            {
                attributes: { type: 'button' },
                document,
            },
        )
        button.append(
            createGentelellaIcon({
                document,
                name,
            }).el,
            createGentelellaElement(
                'span',
                'label',
                {
                    content: name,
                    document,
                },
            ),
        )
        button.addEventListener('click', () => config.onSelect?.(name))
        element.append(button)
    }

    return createGentelellaComponentInstance(element)
}
