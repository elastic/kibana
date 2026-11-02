/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY_MODEL_RESPONSE_ERROR_CODE,
  EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX,
  EmptyModelResponseError,
} from '@kbn/langchain/server';

import {
  EMPTY_MODEL_RESPONSE_ERROR_MARKER,
  getEmptyModelResponseError,
  isEmptyModelResponseError,
  isEmptyModelResponseErrorEntry,
} from '.';

describe('EMPTY_MODEL_RESPONSE_ERROR_MARKER', () => {
  // The marker is matched against persisted error *strings*, so it is only useful while it stays a
  // substring of the message the error is built from. These tests fail if that link breaks.
  it('is the phrase @kbn/langchain exports, not a copy of it', () => {
    // A copy that happens to read the same today stops matching the moment the shared phrase
    // changes, which silently reverts the remedy to "send fewer alerts".
    expect(EMPTY_MODEL_RESPONSE_ERROR_MARKER).toBe(EMPTY_MODEL_RESPONSE_ERROR_MESSAGE_PREFIX);
  });

  it('is a substring of the message EmptyModelResponseError raises', () => {
    const error = new EmptyModelResponseError({
      completionTokens: 0,
      connectorId: 'test-connector-id',
      contentLength: 0,
      responseBody: '',
    });

    expect(error.message).toContain(EMPTY_MODEL_RESPONSE_ERROR_MARKER);
  });

  it('is a substring of the persisted error built from that thrown error', () => {
    const cause = new EmptyModelResponseError({
      completionTokens: 0,
      connectorId: 'test-connector-id',
      contentLength: 0,
      responseBody: '',
    });

    const persisted = getEmptyModelResponseError({
      cause,
      generationAttempts: 3,
      llmType: 'inference',
      nodeName: 'generate',
    });

    expect(persisted).toContain(EMPTY_MODEL_RESPONSE_ERROR_MARKER);
  });

  it('is a substring of the persisted error built without a cause', () => {
    const persisted = getEmptyModelResponseError({
      generationAttempts: 3,
      llmType: 'inference',
      nodeName: 'refine',
    });

    expect(persisted).toContain(EMPTY_MODEL_RESPONSE_ERROR_MARKER);
  });
});

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
      model: 'test-model',
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
    expect(error).toContain('test-model');
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

describe('isEmptyModelResponseErrorEntry', () => {
  it('returns true for a persisted empty-response error', () => {
    const error = getEmptyModelResponseError({
      generationAttempts: 0,
      llmType: 'inference',
      nodeName: 'generate',
    });

    expect(isEmptyModelResponseErrorEntry(error)).toBe(true);
  });

  it('returns false for other persisted errors', () => {
    expect(isEmptyModelResponseErrorEntry('generate node is unable to parse (inference)')).toBe(
      false
    );
  });
});

describe('isEmptyModelResponseError', () => {
  it('returns true for an EmptyModelResponseError', () => {
    expect(
      isEmptyModelResponseError(
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

    expect(isEmptyModelResponseError(wrapped)).toBe(true);
  });

  it('returns false for parse errors, and for non-errors', () => {
    expect(isEmptyModelResponseError(new SyntaxError('Unexpected end of JSON input'))).toBe(false);
    expect(isEmptyModelResponseError(undefined)).toBe(false);
    expect(isEmptyModelResponseError('boom')).toBe(false);
  });
});
