/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isContextLengthExceededError } from '.';

describe('isContextLengthExceededError', () => {
  it('detects the openAI maximum context length message', () => {
    expect(
      isContextLengthExceededError(
        "This model's maximum context length is 4097 tokens, however you requested 5360 tokens"
      )
    ).toBe(true);
  });

  it('detects the bedrock input-is-too-long message', () => {
    expect(isContextLengthExceededError('Input is too long for requested model')).toBe(true);
  });

  it('detects the anthropic exceed-context-limit message', () => {
    expect(
      isContextLengthExceededError(
        'input length and max_tokens exceed context limit: 199926 + 21333 > 200000'
      )
    ).toBe(true);
  });

  it('detects the gemini exceeds-the-maximum-number-of-tokens message', () => {
    expect(
      isContextLengthExceededError(
        'The input token count (1125602) exceeds the maximum number of tokens allowed (1048576)'
      )
    ).toBe(true);
  });

  it('detects the Cohere too-many-tokens message', () => {
    expect(isContextLengthExceededError('too many tokens: size limit exceeded')).toBe(true);
  });

  it('detects the TogetherAI input-token-count message', () => {
    expect(
      isContextLengthExceededError('Input token count + max_tokens parameter must be less')
    ).toBe(true);
  });

  it('detects the EIS request_entity_too_large message', () => {
    expect(isContextLengthExceededError('request_entity_too_large')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(isContextLengthExceededError('MAXIMUM CONTEXT LENGTH exceeded')).toBe(true);
  });

  it('returns false for an unrelated error message', () => {
    expect(isContextLengthExceededError('Connector not found: abc-123')).toBe(false);
  });

  it('returns false for an empty message', () => {
    expect(isContextLengthExceededError('')).toBe(false);
  });
});
