// The short title is what the UI shows where the full name does not fit, and it is
// Lixpi's to decide: no source publishes one. A model that has never been given one
// gets the obvious default rather than nothing, which is what the sync writes into
// its authored file.
//
// The default is the title with the provider's name taken off it, plus any leading
// brand word that directory's `base.json` names in `shortTitleDropsLeadingWords`.
// "Google Veo 3.1" becomes "Veo 3.1", and Anthropic lists "Claude" so "Claude Opus 5"
// becomes "Opus 5", matching the short titles already authored there. A title that
// names neither, which is most of them, is already as short as this rule can make it
// and is used unchanged. Nothing here touches a value somebody has already set.

const collapseSpaces = (value: string): string => value.replace(/\s+/gu, ' ').trim()

// Leading only, and on a word boundary. "GPT Image 2" keeps its name when the
// provider is "OpenAI", and a title that uses the provider's name mid-sentence, such
// as "Nano Banana Pro by Google", is somebody's phrasing and is left alone.
const dropProviderName = (
    title: string,
    providerName: string,
): string => {
    const name = collapseSpaces(providerName)

    if (!name)
        return title

    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

    return collapseSpaces(
        title.replace(
            new RegExp(`^${escaped}\\b[\\s:-]*`, 'iu'),
            '',
        ),
    )
}

// `providerNames` is every name the provider goes by: the brand shown to people, the
// directory's own key, and any leading word the directory asks to drop.
// Longer than any name a person would write, and the length at which a title has
// clearly stopped being one. Google titles `aqa` "Model that performs Attributed
// Question Answering." — a sentence, not a name, and shortening it produces a label
// no interface can use.
const LONGEST_PLAUSIBLE_NAME = 40

export const deriveShortTitle = (
    title: string,
    providerNames: string[],
): string | null => {
    const cleanTitle = collapseSpaces(title)

    if (!cleanTitle)
        return null

    // A description cannot be shortened into a name by dropping words off the front,
    // so this leaves the field blank and the model stays incomplete until somebody
    // gives it one.
    if (
        cleanTitle.length > LONGEST_PLAUSIBLE_NAME
        || cleanTitle.endsWith('.')
    )
        return null

    let shortened = cleanTitle

    for (const providerName of providerNames)
        shortened = dropProviderName(shortened, providerName)

    // Dropping the provider name off "Google" itself would leave nothing to show.
    return shortened || cleanTitle
}
