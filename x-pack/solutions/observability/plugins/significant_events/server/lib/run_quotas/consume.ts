/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunQuotaConsumeResponse, RunQuotaGroup } from '../../../common/run_quotas';
import { mutateRunQuotaLedger, readRunQuotaLedger, readRunQuotaSettings } from './repository';
import { dayKey, resolveDailyWindow } from './window';
import type { RunQuotaSavedObjectsRepository } from './repository';

export const consumeRunQuota = async ({
  internalRepository,
  group,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: RunQuotaGroup;
}): Promise<RunQuotaConsumeResponse> => {
  const date = dayKey(resolveDailyWindow());
  const settings = await readRunQuotaSettings(internalRepository);
  const limit = settings.limits[group];

  return mutateRunQuotaLedger<RunQuotaConsumeResponse>({
    internalRepository,
    date,
    group,
    mutation: (ledger) => {
      if (settings.enabled && limit > 0 && ledger.count >= limit) {
        return { result: { allowed: false } };
      }

      return {
        attributes: { count: ledger.count + 1 },
        result: { allowed: true },
      };
    },
  });
};

export const peekRunQuota = async ({
  internalRepository,
  group,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: RunQuotaGroup;
}): Promise<RunQuotaConsumeResponse> => {
  const date = dayKey(resolveDailyWindow());
  const [settings, ledger] = await Promise.all([
    readRunQuotaSettings(internalRepository),
    readRunQuotaLedger(internalRepository, date, group),
  ]);
  const limit = settings.limits[group];

  return { allowed: !(settings.enabled && limit > 0 && ledger.count >= limit) };
};
