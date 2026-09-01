/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

// @elastic/transport aborts oversized responses with a `RequestAbortedError` whose message reads
// "The content length (N) is bigger than the maximum allowed string (M)" when the uncompressed
// response exceeds `elasticsearch.maxResponseSize`, or "... maximum allowed buffer (M)" when the
// compressed response exceeds the corresponding cap.
const MAX_RESPONSE_SIZE_MESSAGE_PATTERN = /is bigger than the maximum allowed (string|buffer)/;

export const isMaxResponseSizeExceededError = (error: unknown): error is Error => {
  if (!(error instanceof Error)) {
    return false;
  }

  const isRequestAbortedError =
    error instanceof errors.RequestAbortedError || error.name === 'RequestAbortedError';

  return isRequestAbortedError && MAX_RESPONSE_SIZE_MESSAGE_PATTERN.test(error.message);
};
