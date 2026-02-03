/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryPolicy } from '@langchain/langgraph';

/* The "dummy" index pattern to use during the query translation, it is replaced at the end by the actual index pattern.
We have detected that
- using the placeholder "[indexPattern]": makes the LLM get confused because it is not the syntax it expects
- using the wildcard "*": makes it harder for the LLM to understand that it is the index pattern
*/
export const TRANSLATION_INDEX_PATTERN = 'logs*';

export const RETRY_POLICY: RetryPolicy = {
  initialInterval: 1000,
  maxAttempts: 8,
  jitter: true,
};
