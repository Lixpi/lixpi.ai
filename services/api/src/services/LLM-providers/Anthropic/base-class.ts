'use strict'

import { Anthropic } from '@anthropic-ai/sdk'
import LlmProviderBaseClass from '../llm-provider-base-class.ts'

class AnthropicBaseClass extends LlmProviderBaseClass {
    anthropic: Anthropic

    constructor() {
        super()
        this.anthropic = new Anthropic()
    }
}

export default AnthropicBaseClass