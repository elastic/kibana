/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { withTimeout } from '@kbn/std';
import type { InvestigationQuotaCallback, InvestigationQuotaResult } from '../types';

const INVESTIGATION_QUOTA_TIMEOUT_MS = 10_000;
const ALLOWED: InvestigationQuotaResult = { allowed: true };

export const evaluateInvestigationQuota = async ({
  callback,
  logger,
}: {
  callback?: InvestigationQuotaCallback;
  logger: Logger;
}): Promise<InvestigationQuotaResult> => {
  if (!callback) {
    logger.warn(
      'Investigation quota callback is unavailable; allowing the automatic investigation'
    );
    return ALLOWED;
  }

  try {
    const result = await withTimeout({
      promise: Promise.resolve().then(callback),
      timeoutMs: INVESTIGATION_QUOTA_TIMEOUT_MS,
    });

    if (result.timedout) {
      logger.warn(
        `Investigation quota check timed out after ${INVESTIGATION_QUOTA_TIMEOUT_MS}ms; allowing the automatic investigation`
      );
      return ALLOWED;
    }

    return result.value;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Investigation quota check failed; allowing the automatic investigation: ${reason}`
    );
    return ALLOWED;
  }
};
