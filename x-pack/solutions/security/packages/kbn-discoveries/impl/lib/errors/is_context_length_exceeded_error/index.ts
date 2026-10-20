/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Case-insensitive substrings that indicate an LLM token/context-length overflow
 * across providers. These are intentionally REPLICATED (not imported) from the
 * platform inference layer's detection list so that this non-platform package has
 * no dependency on platform inference code — by the time Attack Discovery
 * orchestration sees the failure it is only a string on the error message.
 */
const CONTEXT_LENGTH_SUBSTRINGS: readonly string[] = [
  // openAI — "This model's maximum context length is 4097 tokens, however you requested 5360 tokens"
  'maximum context length',
  // bedrock — "Input is too long for requested model"
  'input is too long',
  // anthropic — "input length and max_tokens exceed context limit: 199926 + 21333 > 200000"
  'exceed context limit',
  // gemini — "The input token count (1125602) exceeds the maximum number of tokens allowed (1048576)"
  'exceeds the maximum number of tokens allowed',
  // Cohere
  'too many tokens',
  // TogetherAI
  'input token count',
  // EIS in dev mode
  'request_entity_too_large',
];

/**
 * Returns `true` when the provided message text matches any known LLM
 * token/context-length overflow substring (case-insensitive).
 */
export const isContextLengthExceededError = (message: string): boolean => {
  const lower = message.toLowerCase();

  return CONTEXT_LENGTH_SUBSTRINGS.some((substring) => lower.includes(substring));
};
