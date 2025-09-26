/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The index pattern placeholder used when translated queries can not determine the correct index pattern */
export const MISSING_INDEX_PATTERN_PLACEHOLDER = '[indexPattern]';

/** Exponential backoff configuration to handle rate limit errors */
export const RETRY_CONFIG = {
  initialRetryDelaySeconds: 1,
  backoffMultiplier: 2,
  maxRetries: 8,
  // max waiting time 4m15s (1*2^8 = 256s)
} as const;
