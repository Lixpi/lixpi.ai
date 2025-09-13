'use strict'

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//
// This code MUST be revised weekly to ensure it is up-to-date with the latest openai models.
// Reference: https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

import { encoding_for_model } from 'tiktoken'

// Helper function to get the assumed model version and log a warning.
const getModelVersion = (modelType, defaultVersion) => {
    console.warn(`Warning: ${modelType} may update over time. Assuming ${defaultVersion}.`)
    return defaultVersion
}

// Calculates the number of tokens in a list of messages for a given model.
export const numTokensFromMessages = (messages, model = 'gpt-4o-mini-2024-07-18') => {
    // List of known models with consistent token counting behavior
    const knownModels = new Set([
        'gpt-3.5-turbo-0125',
        'gpt-4-0314',
        'gpt-4-32k-0314',
        'gpt-4-0613',
        'gpt-4-32k-0613',
        'gpt-4o-mini-2024-07-18',
        'gpt-4o-2024-08-06'
    ])

    // Attempt to get the encoding for the specified model
    let encoding
    try {
        encoding = encoding_for_model(model)
    } catch (error) {
        console.warn('Warning: model not found. Using o200k_base encoding.')
        encoding = encoding_for_model('o200k_base')
    }

    // Constants for token counting
    let tokensPerMessage, tokensPerName
    if (knownModels.has(model)) {
        tokensPerMessage = 3
        tokensPerName = 1
    } else if (model.includes('gpt-3.5-turbo')) {
        console.warn('Warning: gpt-3.5-turbo may update over time. Returning num tokens assuming gpt-3.5-turbo-0125.')
        return numTokensFromMessages(messages, 'gpt-3.5-turbo-0125')
    } else if (model.includes('gpt-4o-mini')) {
        console.warn('Warning: gpt-4o-mini may update over time. Returning num tokens assuming gpt-4o-mini-2024-07-18.')
        return numTokensFromMessages(messages, 'gpt-4o-mini-2024-07-18')
    } else if (model.includes('gpt-4o')) {
        console.warn('Warning: gpt-4o and gpt-4o-mini may update over time. Returning num tokens assuming gpt-4o-2024-08-06.')
        return numTokensFromMessages(messages, 'gpt-4o-2024-08-06')
    } else if (model.includes('gpt-4')) {
        console.warn('Warning: gpt-4 may update over time. Returning num tokens assuming gpt-4-0613.')
        return numTokensFromMessages(messages, 'gpt-4-0613')
    } else {
        throw new Error(`numTokensFromMessages() is not implemented for model ${model}.`)
    }

    // Count tokens
    let numTokens = 0
    for (const message of messages) {
        numTokens += tokensPerMessage
        for (const [key, value] of Object.entries(message)) {
            numTokens += encoding.encode(value).length
            if (key === 'name') {
                numTokens += tokensPerName
            }
        }
    }

    // Add extra tokens for non-streamed assistant messages
    numTokens += 3

    // Free the encoding to prevent memory leaks
    encoding.free()

    return numTokens
}
