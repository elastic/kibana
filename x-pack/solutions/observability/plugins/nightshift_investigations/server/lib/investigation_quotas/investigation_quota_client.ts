/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { dayKey, resolveDailyWindow } from '@kbn/nightshift-shared';
import {
  INVESTIGATION_QUOTA_GROUPS,
  type InvestigationQuotaCounts,
  type InvestigationQuotaSettings,
  type InvestigationQuotasResponse,
  type InvestigationQuotasUpdate,
} from '../../../common/investigation_quotas';
import {
  NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
  NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
} from '../../saved_objects';
import type { InvestigationQuotaResult, InvestigationQuotaTrigger } from '../../types';
import { consumeInvestigationQuota } from './consume';
import { assertCanManageInvestigationQuotas, canManageInvestigationQuotas } from './privileges';
import {
  applyInvestigationQuotaSettingsUpdate,
  readInvestigationQuotaLedger,
  readInvestigationQuotaSettings,
  type InvestigationQuotaSavedObjectsRepository,
} from './repository';

const describeLimit = (limit: number | null): string =>
  limit === null ? 'unlimited' : String(limit);

/** What changed between two settings, such as `manual_investigation 5 -> 7`, empty when nothing did. */
const describeSettingsChange = (
  previous: InvestigationQuotaSettings,
  next: InvestigationQuotaSettings
): string[] => [
  ...(previous.enabled === next.enabled ? [] : [`enabled ${previous.enabled} -> ${next.enabled}`]),
  ...INVESTIGATION_QUOTA_GROUPS.flatMap((group) =>
    previous.limits[group] === next.limits[group]
      ? []
      : [
          `${group} ${describeLimit(previous.limits[group])} -> ${describeLimit(
            next.limits[group]
          )}`,
        ]
  ),
];

export interface InvestigationQuotaClient {
  /** The limits, today's counts and whether the caller may change the limits. */
  get: (request: KibanaRequest) => Promise<InvestigationQuotasResponse>;
  /**
   * Changes the limits. Takes the manage and configure privileges in all spaces, and throws a 403
   * without them.
   */
  update: (
    request: KibanaRequest,
    update: InvestigationQuotasUpdate
  ) => Promise<InvestigationQuotasResponse>;
  /** Charges a start that opens a new investigation to the daily limits for its trigger. */
  consume: (trigger: InvestigationQuotaTrigger) => Promise<InvestigationQuotaResult>;
}

export interface InvestigationQuotaClientDeps {
  savedObjects?: CoreStart['savedObjects'];
  security?: SecurityPluginStart;
}

/**
 * Client for the deployment-wide daily investigation limits. The limits and counts live in hidden
 * saved objects that only this client reads and writes, as the internal user, so they cannot be
 * changed through the generic saved objects APIs.
 */
export const createInvestigationQuotaClient = ({
  getDeps,
  logger,
}: {
  getDeps: () => InvestigationQuotaClientDeps;
  logger: Logger;
}): InvestigationQuotaClient => {
  const getRepository = (): InvestigationQuotaSavedObjectsRepository => {
    const { savedObjects } = getDeps();
    if (!savedObjects) {
      throw new Error('Investigation quotas are unavailable: plugin start() has not been called');
    }
    return savedObjects.createInternalRepository([
      NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
      NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
    ]);
  };

  const readSnapshot = async (
    request: KibanaRequest,
    repository: InvestigationQuotaSavedObjectsRepository
  ): Promise<InvestigationQuotasResponse> => {
    const window = resolveDailyWindow();
    const date = dayKey(window);
    const [settings, ledgers, canManage] = await Promise.all([
      readInvestigationQuotaSettings(repository),
      Promise.all(
        INVESTIGATION_QUOTA_GROUPS.map((group) =>
          readInvestigationQuotaLedger(repository, date, group)
        )
      ),
      canManageInvestigationQuotas({ request, security: getDeps().security }),
    ]);
    const counts: InvestigationQuotaCounts = {
      automatic_investigation: ledgers[0].count,
      manual_investigation: ledgers[1].count,
      total_investigation: ledgers[2].count,
    };
    return { enabled: settings.enabled, limits: settings.limits, counts, window, canManage };
  };

  return {
    get: (request) => readSnapshot(request, getRepository()),

    update: async (request, update) => {
      await assertCanManageInvestigationQuotas({ request, security: getDeps().security });
      const repository = getRepository();
      const { previous, next } = await applyInvestigationQuotaSettingsUpdate(repository, update);
      const changes = describeSettingsChange(previous, next);
      if (changes.length > 0) {
        const username = getDeps().security?.authc.getCurrentUser(request)?.username ?? 'unknown';
        logger.info(`Investigation quota settings changed by ${username}: ${changes.join('; ')}`);
      }
      return readSnapshot(request, repository);
    },

    consume: (trigger) =>
      consumeInvestigationQuota({
        repository: getRepository(),
        trigger,
        date: dayKey(resolveDailyWindow()),
        logger,
      }),
  };
};
