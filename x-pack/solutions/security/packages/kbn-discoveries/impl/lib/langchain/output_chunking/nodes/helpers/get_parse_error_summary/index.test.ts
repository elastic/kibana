/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { getParseErrorSummary } from '.';

const getJsonParseError = (input: string): unknown => {
  try {
    JSON.parse(input);
  } catch (e) {
    return e;
  }
  throw new Error('expected JSON.parse to throw');
};

describe('getParseErrorSummary', () => {
  describe('JSON syntax errors', () => {
    it('keeps the V8 reason and the position, without any of the input', () => {
      const summary = getParseErrorSummary(getJsonParseError('{"SECRET-KEY" "SECRET-VALUE"}'));

      expect(summary).toMatch(
        /^SyntaxError: Expected ':' after property name \(at position \d+\)$/
      );
      expect(summary).not.toContain('SECRET');
    });

    it('keeps the reason of an unterminated string', () => {
      const summary = getParseErrorSummary(getJsonParseError('{"SECRET-KEY'));

      expect(summary).toMatch(/^SyntaxError: Unterminated string \(at position \d+\)$/);
      expect(summary).not.toContain('SECRET');
    });

    it('keeps the reason of a truncated response', () => {
      expect(getParseErrorSummary(getJsonParseError(''))).toBe(
        'SyntaxError: Unexpected end of JSON input'
      );
    });

    it('drops a quoted copy of the input', () => {
      const summary = getParseErrorSummary(getJsonParseError('SECRET-TEXT-gen0gen1'));

      expect(summary).not.toContain('gen0gen1');
      expect(summary).not.toContain('SECRET-TEXT');
    });

    it('drops the unexpected token, which is a character of the input', () => {
      expect(getParseErrorSummary(getJsonParseError('gen0gen1'))).toBe(
        'SyntaxError: Unexpected token'
      );
    });

    it('falls back to a generic reason when the message starts with the quoted input', () => {
      expect(getParseErrorSummary(new SyntaxError('"SECRET" is not valid JSON'))).toBe(
        'SyntaxError: the response is not valid JSON'
      );
    });
  });

  describe('schema validation errors', () => {
    it('summarizes issues by code, path and expected type without quoting keys or values', () => {
      const result = z
        .object({ insights: z.array(z.object({ title: z.string() }).strict()) })
        .safeParse({ insights: [{ title: 1, 'SECRET-KEY': 'SECRET-VALUE' }] });

      const summary = getParseErrorSummary(result.error);

      expect(summary).toContain('the response does not match the expected schema (');
      expect(summary).toContain('invalid_type at insights.0.title (expected string)');
      expect(summary).not.toContain('SECRET');
    });
  });

  describe('other errors', () => {
    it('keeps the name and message of an error without quotes', () => {
      expect(getParseErrorSummary(new TypeError('boom'))).toBe('TypeError: boom');
    });

    it('persists no model output from a Failed to parse line error', () => {
      const error = new Error(
        'Failed to parse line "data: {"choices":[{"delta":{"content":"MODEL-OUTPUT-MARKER"}}]}": Unexpected token'
      );
      error.name = 'ServerSentEventError';
      Object.assign(error, { code: 'internalError' });

      const summary = getParseErrorSummary(error);

      expect(summary).toBe('ServerSentEventError [internalError]: Failed to parse line');
      expect(summary).not.toContain('MODEL-OUTPUT-MARKER');
    });

    it('keeps the leading diagnostic of an ActionsClientLlm action error', () => {
      const error = new Error(
        'ActionsClientLlm: action result status is error: error invoking action - Status code: 429. Message: Too Many Requests'
      );

      expect(getParseErrorSummary(error)).toBe(
        'Error: ActionsClientLlm: action result status is error: error invoking action - Status code: 429. Message: Too Many Requests'
      );
    });

    it('bounds the summary of a long message', () => {
      expect(getParseErrorSummary(new Error('x'.repeat(1000)))).toHaveLength(200);
    });

    it('stringifies a non-error without quoted content', () => {
      expect(getParseErrorSummary('plain "SECRET"')).toBe('plain');
    });
  });
});
