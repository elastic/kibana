/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatCompletionErrorCode,
  InferenceTaskErrorCode,
  isInferenceError,
} from '@kbn/inference-common';
import type { ExecutiveBriefJob } from '../../../../../common/entity_analytics/executive_brief/types';

export type BriefJobErrorCode = NonNullable<ExecutiveBriefJob['error']>['code'];

/** An error with an explicit job error code; thrown by the pipeline for known failure modes. */
export class BriefJobError extends Error {
  constructor(public readonly code: BriefJobErrorCode, message: string) {
    super(message);
    this.name = 'BriefJobError';
  }
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

/**
 * Maps any thrown value to a job error code. Nothing is swallowed: unrecognised errors become
 * `unknown` with their original message.
 */
export const toJobError = (
  error: unknown,
  abortSignal?: AbortSignal
): NonNullable<ExecutiveBriefJob['error']> => {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof BriefJobError) {
    return { code: error.code, message };
  }
  if (isInferenceError(error)) {
    if (
      error.code === ChatCompletionErrorCode.ToolValidationError ||
      error.code === ChatCompletionErrorCode.ToolNotFoundError ||
      error.code === ChatCompletionErrorCode.OutputTokenLimitReachedError ||
      error.code === ChatCompletionErrorCode.ContextLengthExceededError
    ) {
      return { code: 'llm_output', message };
    }
    if (error.code === InferenceTaskErrorCode.abortedError) {
      return { code: 'timeout', message };
    }
    if (
      error.code === InferenceTaskErrorCode.providerError ||
      error.code === InferenceTaskErrorCode.requestError
    ) {
      return { code: 'connector', message };
    }
    return { code: 'unknown', message };
  }
  if (isAbortError(error) || abortSignal?.aborted === true) {
    return { code: 'timeout', message };
  }
  return { code: 'unknown', message };
};
