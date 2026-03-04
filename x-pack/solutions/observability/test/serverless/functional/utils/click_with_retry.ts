/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryService } from '@kbn/ftr-common-functional-services';

const DEFAULT_CLICK_RETRY_TIMEOUT_MS = 10 * 1000;

export const clickWithRetry = async (
  retry: RetryService,
  action: () => Promise<void>,
  timeoutMs: number = DEFAULT_CLICK_RETRY_TIMEOUT_MS
): Promise<void> => {
  await retry.tryForTime(timeoutMs, async () => {
    await action();
  });
};
