import { createDocumentEl } from '@lixpi/ui-primitives/dom'

import {
    type GentelellaContent,
} from './content.ts'
import { combineGentelellaClassNames } from './classNames.ts'

export type GentelellaAttributeValue = boolean | number | string | null | undefined

export type GentelellaElementConfig = {
    attributes?: Readonly<Record<string, GentelellaAttributeValue>>
    className?: string
    content?: GentelellaContent
    document?: Document
    trustedInnerHtml?: string
}

export type GentelellaComponentInstance<ElementType extends HTMLElement = HTMLElement> = {
    readonly el: ElementType
    destroy: () => void
}

export class GentelellaElementComponent<ElementType extends HTMLElement> implements GentelellaComponentInstance<ElementType> {
    constructor(readonly el: ElementType) {}

    destroy(): void {
        this.el.remove()
    }
}

export const createGentelellaElement = <TagName extends keyof HTMLElementTagNameMap>(
    tagName: TagName,
    baseClassName: string,
    config: GentelellaElementConfig = {},
): HTMLElementTagNameMap[TagName] => {
    const document = config.document ?? globalThis.document
    const createElement = createDocumentEl(document)
    const element = createElement(
        tagName,
        {
            ...config.attributes,
            className: combineGentelellaClassNames(baseClassName, config.className),
            innerHTML: config.trustedInnerHtml,
        },
        config.content,
    ) as HTMLElementTagNameMap[TagName]

    return element
}

export const createGentelellaComponentInstance = <ElementType extends HTMLElement>(element: ElementType): GentelellaComponentInstance<ElementType> =>
    new GentelellaElementComponent(element)
