/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { getParseErrorSummary } from '.';

describe('getParseErrorSummary', () => {
  it('does not reproduce any of the input of a JSON syntax error', () => {
    let error: unknown;
    try {
      JSON.parse('{"SECRET-KEY" "SECRET-VALUE"}');
    } catch (e) {
      error = e;
    }

    const summary = getParseErrorSummary(error);

    expect(summary).toContain('SyntaxError: the response is not valid JSON');
    expect(summary).not.toContain('SECRET');
  });

  it('summarizes schema issues by code and path without quoting keys or values', () => {
    const result = z
      .object({ insights: z.array(z.object({ title: z.string() }).strict()) })
      .safeParse({ insights: [{ title: 1, 'SECRET-KEY': 'SECRET-VALUE' }] });

    const summary = getParseErrorSummary(result.error);

    expect(summary).toContain('the response does not match the expected schema (');
    expect(summary).toContain('insights.0.title');
    expect(summary).not.toContain('SECRET');
  });

  it('falls back to the error name and message for other errors', () => {
    expect(getParseErrorSummary(new TypeError('boom'))).toBe('TypeError: boom');
  });
});
