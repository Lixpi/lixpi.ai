// A provider being unreachable is a skip: the sync carries on with what it has. An
// expired or missing AWS session is not, because the run would silently produce a
// catalog missing everything Bedrock knows and nobody would see why. It stops.
// The message travels: it is logged, written to the last-run file, and rendered on
// the catalog page. It states the condition and nothing else. Whoever reads it knows
// how their own session is renewed, and the profile it belongs to identifies an
// account and a person.
export class CredentialsExpiredError extends Error {
    constructor(cause: unknown) {
        super('The AWS SSO session has expired.')
        this.name = 'CredentialsExpiredError'
        this.cause = cause
    }
}

const CREDENTIAL_ERROR_NAMES = new Set([
    'CredentialsProviderError',
    'ExpiredTokenException',
    'ExpiredToken',
    'InvalidGrantException',
    'UnrecognizedClientException',
    'AccessDeniedException',
])

const CREDENTIAL_ERROR_HINTS = [
    'sso session',
    'was not found',
    'expired',
    'could not load credentials',
    'security token included in the request is invalid',
    // A key nobody set is the same class of problem as one that stopped working: the
    // run will produce a catalog missing that provider until somebody fixes the
    // environment.
    'is not set',
]

export const isCredentialsProblem = (error: unknown): boolean => {
    if (!(error instanceof Error))
        return false

    if (CREDENTIAL_ERROR_NAMES.has(error.name))
        return true

    const message = error.message.toLowerCase()

    return CREDENTIAL_ERROR_HINTS.some(hint => message.includes(hint))
}
