/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import {
  EMPTY_MODEL_RESPONSE_ERROR_CODE,
  EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX,
  EmptyModelResponseError,
} from '@kbn/langchain/server';

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

    it('drops a quote token and the `...` prefix of a truncated snippet', () => {
      expect(
        getParseErrorSummary(
          new SyntaxError(`Unexpected token ''', "'MARKER"... is not valid JSON`)
        )
      ).toBe('SyntaxError: Unexpected token');
      expect(
        getParseErrorSummary(
          new SyntaxError(`Unexpected token 'd', ..."MARKER"... is not valid JSON`)
        )
      ).toBe('SyntaxError: Unexpected token');
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

    it('replaces an error name that carries upstream text with a generic one', () => {
      const error = new Error('ActionsClientLlm: action result status is error: boom');
      error.name = `Unexpected token 'd', "data: MODEL-OUTPUT-MARKER"... is not valid JSON`;

      const summary = getParseErrorSummary(error);

      expect(summary).toBe('Error: ActionsClientLlm: action result status is error: boom');
      expect(summary).not.toContain('MODEL-OUTPUT-MARKER');
    });

    it('keeps a conventional custom class name', () => {
      const error = new Error('boom');
      error.name = 'ServerSentEventError';

      expect(getParseErrorSummary(error)).toBe('ServerSentEventError: boom');
    });

    it('keeps the diagnostics of an empty model response whole', () => {
      const error = new EmptyModelResponseError({
        completionTokens: 0,
        connectorId: 'my-connector',
        contentLength: 0,
        model: 'my-model',
        promptTokens: 1234,
        traceId: 'trace-abc',
      });

      const summary = getParseErrorSummary(error);

      expect(summary).toBe(error.message);
      expect(summary).toContain('trace-abc');
      expect(summary).toContain('completion tokens');
    });

    it.each([
      [
        'the prefix with a foreign tail',
        `${EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX}; upstream body: SECRET2`,
      ],
      [
        'the prefix with a quoted tail',
        `${EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX} "data: SECRET"`,
      ],
    ])('gives no message text to an error that only carries %s', (_label, message) => {
      const summary = getParseErrorSummary(new Error(message));

      expect(summary).toBe('Error');
      expect(summary).not.toContain('SECRET');
    });

    it('gives no message text to an error that only carries the code', () => {
      const error = Object.assign(new Error('upstream error SECRET3 no quotes'), {
        code: EMPTY_MODEL_RESPONSE_ERROR_CODE,
      });

      const summary = getParseErrorSummary(error);

      expect(summary).toBe(`Error [${EMPTY_MODEL_RESPONSE_ERROR_CODE}]`);
      expect(summary).not.toContain('SECRET3');
    });

    it.each([
      ['TypeError: "secret"'],
      ['Error secret'],
      [`Error'secret`],
      ['secret Error'],
      ['Error: secret'],
      ['1Error'],
    ])('replaces the error name %j, which is not a class name, with a generic one', (name) => {
      const error = new Error('boom');
      error.name = name;

      const summary = getParseErrorSummary(error);

      expect(summary).toBe('Error: boom');
      expect(summary).not.toContain('secret');
    });

    it.each([['AI_APICallError'], ['ServerSentEventError'], ['HttpException'], ['Error']])(
      'keeps the class name %s',
      (name) => {
        const error = new Error('boom');
        error.name = name;

        expect(getParseErrorSummary(error)).toBe(`${name}: boom`);
      }
    );

    it('does not trust the code alone: a message that is not an empty-response one is sanitized', () => {
      const error = new Error('Failed to parse line "MODEL-OUTPUT-MARKER"');
      Object.assign(error, { code: 'EMPTY_MODEL_RESPONSE' });

      expect(getParseErrorSummary(error)).not.toContain('MODEL-OUTPUT-MARKER');
    });

    it('keeps the leading diagnostic of an ActionsClientLlm action error', () => {
      const error = new Error(
        'ActionsClientLlm: action result status is error: error invoking action - Status code: 429. Message: Too Many Requests'
      );

      expect(getParseErrorSummary(error)).toBe(
        'Error: ActionsClientLlm: action result status is error: error invoking action - Status code: 429. Message: Too Many Requests'
      );
    });

    describe.each([
      ['undefined', undefined],
      ['an object', { text: 'SECRET' }],
    ])('an Error whose message is %s', (_label, message) => {
      const buildError = (code?: string): Error => {
        const error = new Error('placeholder');
        (error as { message: unknown }).message = message;
        if (code != null) {
          Object.assign(error, { code });
        }
        return error;
      };

      it('does not throw, and persists nothing from the message', () => {
        const summary = getParseErrorSummary(buildError());

        expect(summary).toBe('Error: ');
        expect(summary).not.toContain('SECRET');
      });

      it('does not treat it as an empty-response error, even with the empty-response code', () => {
        const summary = getParseErrorSummary(buildError(EMPTY_MODEL_RESPONSE_ERROR_CODE));

        expect(summary.startsWith('Error')).toBe(true);
        expect(summary).not.toContain('SECRET');
      });

      it('rebuilds the diagnostics of an EmptyModelResponseError whose message was replaced', () => {
        const error = new EmptyModelResponseError({
          completionTokens: 0,
          connectorId: 'my-connector',
          contentLength: 0,
        });
        (error as { message: unknown }).message = message;

        const summary = getParseErrorSummary(error);

        expect(summary).not.toContain('SECRET');
        expect(summary).toContain('connectorId: my-connector');
      });
    });

    it('bounds the summary of a long message', () => {
      expect(getParseErrorSummary(new Error('x'.repeat(1000)))).toHaveLength(200);
    });

    describe.each([
      ['a prototype-less object', Object.create(null)],
      ['a Symbol', Symbol('s')],
      ['an Error with a Symbol message', Object.assign(new Error('x'), { message: Symbol('s') })],
      ['an Error with a Symbol name', Object.assign(new Error('x'), { name: Symbol('s') })],
      [
        'an Error with a prototype-less message',
        Object.assign(new Error('x'), { message: Object.create(null) }),
      ],
    ])('a value that cannot be stringified: %s', (_label, value) => {
      it('does not throw', () => {
        expect(() => getParseErrorSummary(value)).not.toThrow();
      });
    });

    it('does not throw on a ZodError issue path segment that cannot be stringified', () => {
      const error = {
        issues: [{ code: 'invalid_type', path: [Object.create(null), Symbol('s')] }],
      };

      let summary = '';
      expect(() => {
        summary = getParseErrorSummary(error);
      }).not.toThrow();
      expect(summary).toContain('[unprintable]');
    });

    it('stringifies a non-error without quoted content', () => {
      expect(getParseErrorSummary('plain "SECRET"')).toBe('plain');
    });
  });
});
