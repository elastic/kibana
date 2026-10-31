/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { withTimeout } from '@kbn/std';
import type { InvestigationQuotaCallback, InvestigationQuotaResult } from '../types';
import { InvestigationUnavailableError } from './errors';

const INVESTIGATION_QUOTA_TIMEOUT_MS = 10_000;

export const evaluateInvestigationQuota = async ({
  callback,
  logger,
}: {
  callback?: InvestigationQuotaCallback;
  logger: Logger;
}): Promise<InvestigationQuotaResult> => {
  const unavailable = (reason: string) => {
    logger.warn(`Investigation quota check ${reason}; denying the automatic investigation`);
    return new InvestigationUnavailableError('The investigation quota check is unavailable');
  };

  if (!callback) {
    throw unavailable('is unavailable');
  }

  const pending = Promise.resolve().then(callback);
  const result = await withTimeout({
    promise: pending,
    timeoutMs: INVESTIGATION_QUOTA_TIMEOUT_MS,
  }).catch((error) => {
    throw unavailable(`failed: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (result.timedout) {
    pending.then(
      (late) =>
        late.allowed
          ? Promise.resolve(late.release?.()).catch((error) =>
              logger.warn(
                `Could not release the late investigation quota slot: ${
                  error instanceof Error ? error.message : String(error)
                }`
              )
            )
          : undefined,
      () => undefined
    );
    throw unavailable(`timed out after ${INVESTIGATION_QUOTA_TIMEOUT_MS}ms`);
  }

  return result.value;
};
