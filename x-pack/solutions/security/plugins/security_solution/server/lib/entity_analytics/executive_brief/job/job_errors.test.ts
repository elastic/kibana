/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInferenceInternalError,
  createInferenceProviderError,
  createInferenceRequestAbortedError,
  createInferenceRequestError,
  ChatCompletionErrorCode,
} from '@kbn/inference-common';
import { BriefJobError, toJobError } from './job_errors';

describe('toJobError', () => {
  it.each([
    ['BriefJobError keeps its code', new BriefJobError('llm_output', 'bad'), 'llm_output'],
    ['provider error', createInferenceProviderError('503', { status: 503 }), 'connector'],
    ['request error', createInferenceRequestError('no connector', 404), 'connector'],
    ['inference abort', createInferenceRequestAbortedError(), 'timeout'],
    ['inference internal error', createInferenceInternalError('x'), 'unknown'],
    [
      'tool validation error',
      Object.assign(createInferenceInternalError('invalid'), {
        code: ChatCompletionErrorCode.ToolValidationError,
      }),
      'llm_output',
    ],
    [
      'output token limit',
      Object.assign(createInferenceInternalError('limit'), {
        code: ChatCompletionErrorCode.OutputTokenLimitReachedError,
      }),
      'llm_output',
    ],
    ['TimeoutError', Object.assign(new Error('t'), { name: 'TimeoutError' }), 'timeout'],
    ['AbortError', Object.assign(new Error('a'), { name: 'AbortError' }), 'timeout'],
    ['plain error', new Error('x'), 'unknown'],
    ['non-error throw', 'text', 'unknown'],
  ])('%s', (_name, error, code) => {
    expect(toJobError(error).code).toBe(code);
  });

  it('treats any error as timeout when the signal has aborted, but not otherwise', () => {
    const controller = new AbortController();
    expect(toJobError(new Error('x'), controller.signal).code).toBe('unknown');
    controller.abort();
    expect(toJobError(new Error('x'), controller.signal).code).toBe('timeout');
  });

  it('preserves the message', () => {
    expect(toJobError(new Error('detail'))).toEqual({ code: 'unknown', message: 'detail' });
    expect(toJobError('text')).toEqual({ code: 'unknown', message: 'text' });
  });
});
