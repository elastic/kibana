/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { useInvestigationQuotas } from '../../../data/run_quotas/use_investigation_quotas';
import { useKibana } from '../../../hooks/use_kibana';
import {
  getAutomationBlockingLimit,
  type AutomationBlockingLimit,
} from '../utils/filter_automations';

interface GlobalLimit {
  isReached: boolean;
  /** The deployment-wide limit that blocks every automation today, if any. */
  blockingLimit?: AutomationBlockingLimit;
  /** The blocking limit's value, else the limit for all automations combined. */
  limit?: number;
  settingsHref?: string;
  refetch: () => Promise<unknown>;
}

export const useGlobalLimit = (): GlobalLimit => {
  const { data: quotas, refetch } = useInvestigationQuotas();
  const { application } = useKibana().services;
  const blockingLimit = getAutomationBlockingLimit(quotas);

  return {
    isReached: blockingLimit !== undefined,
    blockingLimit,
    limit: quotas?.limits[blockingLimit ?? 'automatic_investigation'] ?? undefined,
    settingsHref: quotas?.canManage
      ? application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/settings/investigations' })
      : undefined,
    refetch,
  };
};
