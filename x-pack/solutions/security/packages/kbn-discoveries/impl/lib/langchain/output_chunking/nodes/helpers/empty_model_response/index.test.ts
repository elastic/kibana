/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_MODEL_RESPONSE_ERROR_CODE, EmptyModelResponseError } from '@kbn/langchain/server';

import {
  EMPTY_MODEL_RESPONSE_ERROR_MARKER,
  getEmptyModelResponseError,
  isEmptyModelResponseError,
  isEmptyModelResponseErrorCode,
} from '.';

describe('getEmptyModelResponseError', () => {
  it('names the node, the llm type and the attempt', () => {
    const error = getEmptyModelResponseError({
      generationAttempts: 2,
      llmType: 'inference',
      nodeName: 'generate',
    });

    expect(error).toContain(EMPTY_MODEL_RESPONSE_ERROR_MARKER);
    expect(error).toContain('generate node');
    expect(error).toContain('(inference)');
    expect(error).toContain('attempt 2');
  });

  it('states that the remedy is not a smaller prompt', () => {
    const error = getEmptyModelResponseError({
      generationAttempts: 0,
      llmType: 'inference',
      nodeName: 'refine',
    });

    expect(error).toContain('not a prompt-size problem');
  });

  it('includes the underlying error message when the empty response was thrown', () => {
    const cause = new EmptyModelResponseError({
      completionTokens: 0,
      connectorId: 'test-connector-id',
      contentLength: 0,
      model: 'anthropic-claude-5.5-opus',
      promptTokens: 128390,
      responseBody: '',
      traceId: 'test-trace-id',
    });

    const error = getEmptyModelResponseError({
      cause,
      generationAttempts: 9,
      llmType: 'inference',
      nodeName: 'generate',
    });

    expect(error).toContain('test-connector-id');
    expect(error).toContain('anthropic-claude-5.5-opus');
    expect(error).toContain('prompt tokens: 128390');
  });

  it('serializes a non-Error cause', () => {
    const error = getEmptyModelResponseError({
      cause: 'upstream timeout',
      generationAttempts: 0,
      llmType: 'inference',
      nodeName: 'generate',
    });

    expect(error).toContain('upstream timeout');
  });
});

describe('isEmptyModelResponseError', () => {
  it('returns true for a persisted empty-response error', () => {
    const error = getEmptyModelResponseError({
      generationAttempts: 0,
      llmType: 'inference',
      nodeName: 'generate',
    });

    expect(isEmptyModelResponseError(error)).toBe(true);
  });

  it('returns false for other persisted errors', () => {
    expect(isEmptyModelResponseError('generate node is unable to parse (inference)')).toBe(false);
  });
});

describe('isEmptyModelResponseErrorCode', () => {
  it('returns true for an EmptyModelResponseError', () => {
    expect(
      isEmptyModelResponseErrorCode(
        new EmptyModelResponseError({
          connectorId: 'test-connector-id',
          contentLength: 0,
          responseBody: '',
        })
      )
    ).toBe(true);
  });

  it('returns true when the error was re-wrapped but kept the code', () => {
    const wrapped = new Error('wrapped by a framework');
    Object.assign(wrapped, { code: EMPTY_MODEL_RESPONSE_ERROR_CODE });

    expect(isEmptyModelResponseErrorCode(wrapped)).toBe(true);
  });

  it('returns false for parse errors, and for non-errors', () => {
    expect(isEmptyModelResponseErrorCode(new SyntaxError('Unexpected end of JSON input'))).toBe(
      false
    );
    expect(isEmptyModelResponseErrorCode(undefined)).toBe(false);
    expect(isEmptyModelResponseErrorCode('boom')).toBe(false);
  });
});
