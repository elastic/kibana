import { BEDROCK_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT, GEMINI_SYSTEM_PROMPT, STRUCTURED_SYSTEM_PROMPT } from "./prompts";

describe('prompts', () => {
    it.each([
        [DEFAULT_SYSTEM_PROMPT, '{include_citations_prompt_placeholder}', 1],
        [GEMINI_SYSTEM_PROMPT, '{include_citations_prompt_placeholder}', 1],
        [BEDROCK_SYSTEM_PROMPT, '{include_citations_prompt_placeholder}', 1],
        [STRUCTURED_SYSTEM_PROMPT, '{include_citations_prompt_placeholder}', 1],
        [DEFAULT_SYSTEM_PROMPT, 'You are a security analyst', 1],
        [GEMINI_SYSTEM_PROMPT, 'You are an assistant', 1],
        [BEDROCK_SYSTEM_PROMPT, 'You are a security analyst', 1],
    ])('"%s" contains "%s" %s times', async (prompt: string, containedString: string, expectedCount: number) => {
        const regex = new RegExp(containedString, "g");
        expect((prompt.match(regex) || []).length).toBe(expectedCount);
    })

});