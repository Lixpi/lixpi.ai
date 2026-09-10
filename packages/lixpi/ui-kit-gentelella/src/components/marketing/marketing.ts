import {
    createGentelellaComponentInstance,
    createGentelellaElement,
    type GentelellaComponentInstance,
} from '../../component.ts'
import {
    type GentelellaContent,
} from '../../content.ts'

export type GentelellaLandingNavigationConfig = {
    actions?: GentelellaContent
    brand: GentelellaContent
    className?: string
    document?: Document
    links?: GentelellaContent
}

export const createGentelellaLandingNavigation = (config: GentelellaLandingNavigationConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'nav',
        'landing-nav',
        {
            className: config.className,
            document,
        },
    )
    element.append(
        createGentelellaElement(
            'div',
            'brand',
            {
                content: config.brand,
                document,
            },
        ),
        createGentelellaElement(
            'div',
            'nav-link',
            {
                content: config.links,
                document,
            },
        ),
        createGentelellaElement(
            'div',
            'page-actions',
            {
                content: config.actions,
                document,
            },
        ),
    )

    return createGentelellaComponentInstance(element)
}

export type GentelellaHeroConfig = {
    actions?: GentelellaContent
    className?: string
    description?: GentelellaContent
    document?: Document
    eyebrow?: string
    media?: GentelellaContent
    title: GentelellaContent
}

export const createGentelellaHero = (config: GentelellaHeroConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'hero',
        {
            className: config.className,
            document,
        },
    )
    const content = createGentelellaElement(
        'div',
        'hero-content',
        { document },
    )

    if (config.eyebrow)
        content.append(
            createGentelellaElement(
                'div',
                'page-pretitle',
                {
                    content: config.eyebrow,
                    document,
                },
            ),
        )

    content.append(
        createGentelellaElement(
            'h1',
            'title',
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.description)
        content.append(
            createGentelellaElement(
                'div',
                'desc',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    if (config.actions)
        content.append(
            createGentelellaElement(
                'div',
                'page-actions',
                {
                    content: config.actions,
                    document,
                },
            ),
        )

    element.append(content)

    if (config.media)
        element.append(
            createGentelellaElement(
                'div',
                'preview',
                {
                    content: config.media,
                    document,
                },
            ),
        )

    return createGentelellaComponentInstance(element)
}

export type GentelellaFeature = {
    description: GentelellaContent
    icon?: GentelellaContent
    title: string
}

export type GentelellaFeatureGridConfig = {
    className?: string
    document?: Document
    features: GentelellaFeature[]
}

export const createGentelellaFeatureGrid = (config: GentelellaFeatureGridConfig): GentelellaComponentInstance<HTMLDivElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'div',
        'features',
        {
            className: config.className,
            document,
        },
    )

    for (const feature of config.features) {
        const card = createGentelellaElement(
            'article',
            'feature',
            { document },
        )

        if (feature.icon)
            card.append(
                createGentelellaElement(
                    'div',
                    'icon',
                    {
                        content: feature.icon,
                        document,
                    },
                ),
            )

        card.append(
            createGentelellaElement(
                'div',
                'title',
                {
                    content: feature.title,
                    document,
                },
            ),
            createGentelellaElement(
                'div',
                'desc',
                {
                    content: feature.description,
                    document,
                },
            ),
        )
        element.append(card)
    }

    return createGentelellaComponentInstance(element)
}

export type GentelellaCallToActionConfig = {
    action: GentelellaContent
    className?: string
    description?: GentelellaContent
    document?: Document
    title: GentelellaContent
}

export const createGentelellaCallToAction = (config: GentelellaCallToActionConfig): GentelellaComponentInstance<HTMLElement> => {
    const document = config.document ?? globalThis.document
    const element = createGentelellaElement(
        'section',
        'cta-band',
        {
            className: config.className,
            document,
        },
    )
    const content = createGentelellaElement(
        'div',
        'cta',
        { document },
    )
    content.append(
        createGentelellaElement(
            'div',
            'title',
            {
                content: config.title,
                document,
            },
        ),
    )

    if (config.description)
        content.append(
            createGentelellaElement(
                'div',
                'desc',
                {
                    content: config.description,
                    document,
                },
            ),
        )

    content.append(
        createGentelellaElement(
            'div',
            'page-actions',
            {
                content: config.action,
                document,
            },
        ),
    )
    element.append(content)

    return createGentelellaComponentInstance(element)
}
