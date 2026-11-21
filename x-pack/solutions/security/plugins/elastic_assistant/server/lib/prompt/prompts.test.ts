/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
  BEDROCK_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
} from './prompts';

describe('prompts', () => {
  it.each([
    [DEFAULT_SYSTEM_PROMPT, '{citations_prompt}', 1],
    [GEMINI_SYSTEM_PROMPT, '{citations_prompt}', 1],
    [BEDROCK_SYSTEM_PROMPT, '{citations_prompt}', 1],
    [DEFAULT_SYSTEM_PROMPT, '{formattedTime}', 1],
    [GEMINI_SYSTEM_PROMPT, '{formattedTime}', 1],
    [BEDROCK_SYSTEM_PROMPT, '{formattedTime}', 1],
    [DEFAULT_SYSTEM_PROMPT, 'You are a security analyst', 1],
    [GEMINI_SYSTEM_PROMPT, 'You are an assistant', 1],
    [BEDROCK_SYSTEM_PROMPT, 'You are a security analyst', 1],
  ])(
    'simple prompt validation',
    (prompt: string, containedString: string, expectedCount: number) => {
      const regex = new RegExp(containedString, 'g');
      expect((prompt.match(regex) || []).length).toBe(expectedCount);
    }
  );

  // Claude Opus 5.5 returns finish_reason content_filter for "Show your reasoning" in these prompts
  it.each([
    ['ATTACK_DISCOVERY_DEFAULT', ATTACK_DISCOVERY_DEFAULT],
    ['ATTACK_DISCOVERY_REFINE', ATTACK_DISCOVERY_REFINE],
  ])('%s does not ask the model to show its reasoning', (_, prompt) => {
    expect(prompt).not.toMatch(/show your reasoning/i);
    expect(prompt).toMatch(/Explain your analysis before the json output section/i);
  });
});
