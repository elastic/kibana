/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isRunQuotaReached,
  type RunQuotaConsumeResponse,
  type RunQuotaGroup,
} from '../../../common/run_quotas';
import { mutateRunQuotaLedger, readRunQuotaSettings } from './repository';
import { dayKey, resolveDailyWindow } from './window';
import type { RunQuotaSavedObjectsRepository } from './repository';

export const consumeRunQuota = async ({
  internalRepository,
  group,
  date = dayKey(resolveDailyWindow()),
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: RunQuotaGroup;
  date?: string;
}): Promise<RunQuotaConsumeResponse> => {
  const settings = await readRunQuotaSettings(internalRepository);
  const limit = settings.limits[group];

  return mutateRunQuotaLedger<RunQuotaConsumeResponse>({
    internalRepository,
    date,
    group,
    mutation: (ledger) => {
      if (isRunQuotaReached({ group, enabled: settings.enabled, limit, count: ledger.count })) {
        return { result: { allowed: false } };
      }

      return {
        attributes: { count: ledger.count + 1 },
        result: { allowed: true },
      };
    },
  });
};

export const releaseRunQuota = async ({
  internalRepository,
  group,
  date,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: RunQuotaGroup;
  date: string;
}): Promise<void> =>
  mutateRunQuotaLedger<void>({
    internalRepository,
    date,
    group,
    mutation: (ledger) =>
      ledger.count > 0
        ? { attributes: { count: ledger.count - 1 }, result: undefined }
        : { result: undefined },
  });
