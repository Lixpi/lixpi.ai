import process from 'node:process'

// A failure message written by a provider SDK is not written for an audience. It gets
// logged, saved to the last-run file, and rendered on the catalog page, so anything
// identifying in it has left the container by then.
//
// This takes out what a message has no business carrying: the AWS profile the service
// runs as, AWS account numbers, and any credential an SDK echoed back in a URL or a
// header. Nothing here is a substitute for not putting a secret in a message in the
// first place; it is the last thing between one and a browser.

const CREDENTIAL_QUERY_PARAM = /\b(key|api[_-]?key|access[_-]?token|token|signature|password|secret)=([^&\s"']+)/giu

const BEARER_TOKEN = /\b(bearer|basic)\s+[A-Za-z0-9._~+/-]{8,}=*/giu

// The account number in an ARN, which every Bedrock inference-profile ARN carries.
const ARN_ACCOUNT = /(arn:aws[a-z-]*:[a-z0-9-]+:[a-z0-9-]*:)(\d{12})/giu

const escapeForRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

export const redactSensitive = (message: string): string => {
    const profile = process.env.AWS_PROFILE?.trim()

    let redacted = message
        .replace(CREDENTIAL_QUERY_PARAM, '$1=<redacted>')
        .replace(BEARER_TOKEN, '$1 <redacted>')
        .replace(ARN_ACCOUNT, '$1<account>')

    // A one or two character value would match half the words in a sentence, so it is
    // left alone: a profile named that is not identifying anyway.
    if (
        profile
        && profile.length > 2
    ) {
        redacted = redacted.replace(
            new RegExp(
                escapeForRegex(profile),
                'giu',
            ),
            '<AWS_PROFILE>',
        )
    }

    return redacted
}
