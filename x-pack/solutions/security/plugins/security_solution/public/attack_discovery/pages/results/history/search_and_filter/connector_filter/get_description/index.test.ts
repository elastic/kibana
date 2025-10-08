/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDescription } from '.';

jest.mock('../translations', () => ({
  AMAZON_BEDROCK: 'Amazon Bedrock',
  GOOGLE_GEMINI: 'Google Gemini',
  OPENAI: 'OpenAI',
}));

describe('getDescription', () => {
  it("returns the expected description for '.bedrock'", () => {
    expect(getDescription('.bedrock')).toBe('Amazon Bedrock');
  });

  it("returns the expected description for '.gemini'", () => {
    expect(getDescription('.gemini')).toBe('Google Gemini');
  });

  it("returns the expected description for '.gen-ai'", () => {
    expect(getDescription('.gen-ai')).toBe('OpenAI');
  });

  it('returns undefined for an unknown actionTypeId', () => {
    expect(getDescription('unknown')).toBeUndefined();
  });

  it('returns undefined for an undefined actionTypeId', () => {
    expect(getDescription(undefined)).toBeUndefined();
  });
});
