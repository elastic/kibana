/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_MODEL_RESPONSE_ERROR_CODE } from '@kbn/langchain/server';

/**
 * Stable phrase written into the persisted `errors` entries of the generate and refine nodes when a
 * model returns no content. `throwIfErrorCountsExceeded` matches on it to report the real cause
 * instead of prescribing a remedy that cannot work.
 */
export const EMPTY_MODEL_RESPONSE_ERROR_MARKER = 'the model returned an empty response';

/** Returns true when a persisted graph error was produced for an empty model response. */
export const isEmptyModelResponseError = (error: string): boolean =>
  error.includes(EMPTY_MODEL_RESPONSE_ERROR_MARKER);

/**
 * Returns true when a thrown error is an empty-completion failure, even if LangChain re-wrapped it
 * (the guard in `@kbn/langchain`'s `ActionsClientLlm` carries a stable code for this reason).
 */
export const isEmptyModelResponseErrorCode = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  (error as { code?: unknown }).code === EMPTY_MODEL_RESPONSE_ERROR_CODE;

/**
 * Builds the persisted error entry for a model response that contained no content.
 *
 * An empty response is a model or connector failure, not a "generation": it must be recorded as an
 * error so the attempt ledger is accurate, and it must not be classified as a repeated generation
 * (three identical empty responses used to discard the accumulated state without recording
 * anything, so the reported failure count was lower than the number of failed attempts).
 */
export const getEmptyModelResponseError = ({
  cause,
  generationAttempts,
  llmType,
  nodeName,
}: {
  cause?: unknown;
  generationAttempts: number;
  llmType: string;
  nodeName: string;
}): string => {
  const causeMessage =
    cause == null
      ? ''
      : ` Underlying error: ${cause instanceof Error ? cause.message : String(cause)}`;

  return `${nodeName} node detected that ${EMPTY_MODEL_RESPONSE_ERROR_MARKER} (${llmType}) on attempt ${generationAttempts}; the response contained no content. This is a model or connector problem, not a prompt-size problem.${causeMessage}`;
};
