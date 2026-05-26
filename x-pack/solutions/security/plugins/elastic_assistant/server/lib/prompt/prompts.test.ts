/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_SUMMARY_SYSTEM_PROMPT,
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

  // The EASE alert summary flyout parses the LLM response with `JSON.parse` and
  // reads the `summary` / `recommendedActions` keys. These assertions lock the
  // output contract so any future edit to the prompt has to preserve it.
  describe('ALERT_SUMMARY_SYSTEM_PROMPT', () => {
    it('requires a single-line stringified JSON object', () => {
      expect(ALERT_SUMMARY_SYSTEM_PROMPT).toMatch(/single-line stringified JSON object/);
    });

    it('forbids markdown code fences in the response', () => {
      expect(ALERT_SUMMARY_SYSTEM_PROMPT).toMatch(/code fences/);
      expect(ALERT_SUMMARY_SYSTEM_PROMPT).toMatch(/triple backticks/);
    });

    it('names the required JSON keys', () => {
      expect(ALERT_SUMMARY_SYSTEM_PROMPT).toMatch(/"summary"/);
      expect(ALERT_SUMMARY_SYSTEM_PROMPT).toMatch(/"recommendedActions"/);
    });

    it('requires recommendedActions to start with a `###` header', () => {
      expect(ALERT_SUMMARY_SYSTEM_PROMPT).toMatch(/`recommendedActions`.+`###` header/s);
    });

    it('includes a parseable single-line example response', () => {
      // The example uses `{{` / `}}` to escape literal braces for prompt
      // templating downstream. Pick the single-line example at the end of the
      // prompt, unescape, and confirm it is valid JSON with the expected keys.
      const matches = ALERT_SUMMARY_SYSTEM_PROMPT.match(/\{\{[^\n]+\}\}/g);
      expect(matches).not.toBeNull();
      const example = matches![matches!.length - 1].replace(/\{\{/g, '{').replace(/\}\}/g, '}');
      const parsed = JSON.parse(example);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('recommendedActions');
    });
  });
});
