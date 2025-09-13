'use strict'

import OpenAI from "openai"
import LlmProviderBaseClass from '../llm-provider-base-class.ts'

class OpenAiBaseClass extends LlmProviderBaseClass {
    openai: OpenAI

    constructor() {
        super()
        this.openai = new OpenAI()
    }
}

export default OpenAiBaseClass
