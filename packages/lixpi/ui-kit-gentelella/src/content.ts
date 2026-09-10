export type GentelellaContent = Node | string | number | false | null | undefined | GentelellaContent[]

export const appendGentelellaContent = (
    target: Element,
    content: GentelellaContent,
): void => {
    if (Array.isArray(content)) {
        for (const item of content)
            appendGentelellaContent(target, item)

        return
    }

    if (
        content === false
        || content === null
        || content === undefined
    )
        return

    target.append(
        typeof content === 'object'
            && 'nodeType' in content
            ? content
            : String(content),
    )
}
