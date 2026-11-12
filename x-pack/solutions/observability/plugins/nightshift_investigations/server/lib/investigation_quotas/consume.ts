/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isInvestigationQuotaReached,
  type InvestigationQuotaGroup,
  type InvestigationQuotaSettings,
} from '../../../common/investigation_quotas';
import type { InvestigationQuotaResult, InvestigationQuotaTrigger } from '../../types';
import {
  mutateInvestigationQuotaLedger,
  readInvestigationQuotaSettings,
  type InvestigationQuotaSavedObjectsRepository,
} from './repository';

type GroupConsumeResult = { allowed: true } | { allowed: false; limit: number };

const consumeGroup = ({
  repository,
  settings,
  group,
  date,
}: {
  repository: InvestigationQuotaSavedObjectsRepository;
  settings: InvestigationQuotaSettings;
  group: InvestigationQuotaGroup;
  date: string;
}): Promise<GroupConsumeResult> => {
  const limit = settings.limits[group];

  return mutateInvestigationQuotaLedger<GroupConsumeResult>({
    repository,
    date,
    group,
    mutation: (ledger) => {
      // Runs are counted whether or not the limits are enforced, so turning them back on starts from
      // an accurate count.
      if (
        limit !== null &&
        isInvestigationQuotaReached({ enabled: settings.enabled, limit, count: ledger.count })
      ) {
        return { result: { allowed: false, limit } };
      }
      return { count: ledger.count + 1, result: { allowed: true } };
    },
  });
};

export const releaseInvestigationQuota = ({
  repository,
  group,
  date,
}: {
  repository: InvestigationQuotaSavedObjectsRepository;
  group: InvestigationQuotaGroup;
  date: string;
}): Promise<void> =>
  mutateInvestigationQuotaLedger<void>({
    repository,
    date,
    group,
    mutation: (ledger) =>
      ledger.count > 0 ? { count: ledger.count - 1, result: undefined } : { result: undefined },
  });

/**
 * Charges a start to the limit for its trigger and to the limit for all investigations. A start
 * denied by either limit leaves both counts unchanged.
 */
export const consumeInvestigationQuota = async ({
  repository,
  trigger,
  date,
}: {
  repository: InvestigationQuotaSavedObjectsRepository;
  trigger: InvestigationQuotaTrigger;
  date: string;
}): Promise<InvestigationQuotaResult> => {
  const settings = await readInvestigationQuotaSettings(repository);
  const ownGroup: InvestigationQuotaGroup =
    trigger === 'manual' ? 'manual_investigation' : 'automatic_investigation';
  const release = (group: InvestigationQuotaGroup) =>
    releaseInvestigationQuota({ repository, group, date });

  const own = await consumeGroup({ repository, settings, group: ownGroup, date });
  if (!own.allowed) {
    return { allowed: false, deniedBy: trigger, limit: own.limit };
  }

  const total = await consumeGroup({
    repository,
    settings,
    group: 'total_investigation',
    date,
  }).catch(async (error) => {
    await release(ownGroup);
    throw error;
  });
  if (!total.allowed) {
    await release(ownGroup);
    return { allowed: false, deniedBy: 'all', limit: total.limit };
  }

  return {
    allowed: true,
    // Each ledger is released even when the other fails; the first failure is still reported.
    release: async () => {
      const [failed] = (
        await Promise.allSettled([release('total_investigation'), release(ownGroup)])
      ).filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failed) {
        throw failed.reason;
      }
    },
  };
};
