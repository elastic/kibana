/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
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

type GroupConsumeResult =
  | { allowed: true; before: number; after: number }
  | { allowed: false; limit: number; count: number };

interface GroupRelease {
  before: number;
  after: number;
}

const describeLimit = (limit: number | null): string =>
  limit === null ? 'unlimited' : String(limit);

const describeStart = (trigger: InvestigationQuotaTrigger): string =>
  trigger === 'manual' ? 'a manual start' : 'an automatic start';

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
        return { result: { allowed: false, limit, count: ledger.count } };
      }
      return {
        count: ledger.count + 1,
        result: { allowed: true, before: ledger.count, after: ledger.count + 1 },
      };
    },
  });
};

/** Gives one slot back, never going below zero, and reports the count before and after. */
export const releaseInvestigationQuota = ({
  repository,
  group,
  date,
}: {
  repository: InvestigationQuotaSavedObjectsRepository;
  group: InvestigationQuotaGroup;
  date: string;
}): Promise<GroupRelease> =>
  mutateInvestigationQuotaLedger<GroupRelease>({
    repository,
    date,
    group,
    mutation: (ledger) =>
      ledger.count > 0
        ? {
            count: ledger.count - 1,
            result: { before: ledger.count, after: ledger.count - 1 },
          }
        : { result: { before: ledger.count, after: ledger.count } },
  });

const describeRelease = (group: InvestigationQuotaGroup, { before, after }: GroupRelease): string =>
  before === after ? `${group} already at ${before}` : `${group} ${before} -> ${after}`;

/**
 * Charges a start to the limit for its trigger and to the limit for all investigations. A start
 * denied by either limit leaves both counts unchanged. Charges, denials and releases are logged
 * with the counts before and after.
 */
export const consumeInvestigationQuota = async ({
  repository,
  trigger,
  date,
  logger,
}: {
  repository: InvestigationQuotaSavedObjectsRepository;
  trigger: InvestigationQuotaTrigger;
  date: string;
  logger: Logger;
}): Promise<InvestigationQuotaResult> => {
  const settings = await readInvestigationQuotaSettings(repository);
  const ownGroup: InvestigationQuotaGroup =
    trigger === 'manual' ? 'manual_investigation' : 'automatic_investigation';
  // Rolling back a charge that was never reported is not logged: the counts end where they began.
  const rollBack = (group: InvestigationQuotaGroup) =>
    releaseInvestigationQuota({ repository, group, date });

  const own = await consumeGroup({ repository, settings, group: ownGroup, date });
  if (!own.allowed) {
    logger.info(
      `Investigation quota denied ${describeStart(trigger)}: ${ownGroup} is at its limit of ${
        own.limit
      } (count ${own.count})`
    );
    return { allowed: false, deniedBy: trigger, limit: own.limit };
  }

  const total = await consumeGroup({
    repository,
    settings,
    group: 'total_investigation',
    date,
  }).catch(async (error) => {
    await rollBack(ownGroup);
    throw error;
  });
  if (!total.allowed) {
    await rollBack(ownGroup);
    logger.info(
      `Investigation quota denied ${describeStart(
        trigger
      )}: total_investigation is at its limit of ${total.limit} (count ${total.count})`
    );
    return { allowed: false, deniedBy: 'all', limit: total.limit };
  }

  logger.info(
    `Investigation quota charged for ${describeStart(trigger)}: ` +
      `${ownGroup} ${own.before} -> ${own.after} of ${describeLimit(settings.limits[ownGroup])}, ` +
      `total_investigation ${total.before} -> ${total.after} of ${describeLimit(
        settings.limits.total_investigation
      )}${settings.enabled ? '' : ' (limits not enforced)'}`
  );

  return {
    allowed: true,
    // Each ledger is released even when the other fails; the first failure is still reported.
    release: async () => {
      const groups = [ownGroup, 'total_investigation'] as const;
      const results = await Promise.allSettled(
        groups.map((group) => releaseInvestigationQuota({ repository, group, date }))
      );
      const released = results.flatMap((result, index) =>
        result.status === 'fulfilled' ? [describeRelease(groups[index], result.value)] : []
      );
      if (released.length > 0) {
        logger.info(
          `Investigation quota released for ${describeStart(trigger)}: ${released.join(', ')}`
        );
      }
      const [failed] = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (failed) {
        throw failed.reason;
      }
    },
  };
};
