/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MODEL_REFUSAL_ERROR_MESSAGE_PREFIX } from '@kbn/langchain/server';

/**
 * Case-insensitive substrings that indicate the model refused the request. The
 * `ModelRefusalError` prefix is never translated, so it still matches after the message reaches
 * Attack Discovery orchestration as a (possibly translated) string.
 */
const CONTENT_FILTER_SUBSTRINGS: readonly string[] = [
  MODEL_REFUSAL_ERROR_MESSAGE_PREFIX.toLowerCase(),
  'finish_reason: content_filter',
];

/**
 * Returns `true` when the provided message text says the model refused the request, for example
 * when the provider content filter stopped the response.
 */
export const isContentFilterError = (message: string): boolean => {
  const lower = message.toLowerCase();

  return CONTENT_FILTER_SUBSTRINGS.some((substring) => lower.includes(substring));
};
