/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dayKey, resolveDailyWindow } from '@kbn/nightshift-shared';
import {
  isRunQuotaReached,
  type InvestigationRunQuotaGroup,
  type RunQuotaConsumeResponse,
  type RunQuotaGroup,
} from '../../../common/run_quotas';
import { mutateRunQuotaLedger, readRunQuotaSettings } from './repository';
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
      if (
        isRunQuotaReached({
          group,
          enabled: settings.enabled,
          investigationLimitsEnabled: settings.investigationLimitsEnabled,
          limit,
          count: ledger.count,
        })
      ) {
        return { result: { allowed: false, limit } };
      }

      return {
        attributes: { count: ledger.count + 1 },
        result: { allowed: true, limit },
      };
    },
  });
};

export type InvestigationRunQuotaConsumeResult =
  | { allowed: true; release: () => Promise<void> }
  | { allowed: false; deniedBy: InvestigationRunQuotaGroup; limit: number };

/**
 * Charges an investigation start to its own limit (`investigation` or `manual_investigation`) and
 * to `total_investigation`. A start denied by either limit leaves both counts unchanged.
 */
export const consumeInvestigationRunQuota = async ({
  internalRepository,
  group,
  date,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  group: Exclude<InvestigationRunQuotaGroup, 'total_investigation'>;
  date: string;
}): Promise<InvestigationRunQuotaConsumeResult> => {
  const release = (releasedGroup: RunQuotaGroup) =>
    releaseRunQuota({ internalRepository, group: releasedGroup, date });

  const own = await consumeRunQuota({ internalRepository, group, date });
  if (!own.allowed) {
    return { allowed: false, deniedBy: group, limit: own.limit };
  }

  const total = await consumeRunQuota({
    internalRepository,
    group: 'total_investigation',
    date,
  }).catch(async (error) => {
    await release(group);
    throw error;
  });
  if (!total.allowed) {
    await release(group);
    return { allowed: false, deniedBy: 'total_investigation', limit: total.limit };
  }

  return {
    allowed: true,
    // Each ledger is released even when the other fails; the first failure is still reported.
    release: async () => {
      const [failed] = (
        await Promise.allSettled([release('total_investigation'), release(group)])
      ).filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failed) {
        throw failed.reason;
      }
    },
  };
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
