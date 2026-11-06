/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { useRunQuotas } from '../../../data/run_quotas/use_significant_events_run_quotas';
import { useKibana } from '../../../hooks/use_kibana';
import { isGlobalInvestigationLimitReached } from '../utils/filter_automations';

interface GlobalLimit {
  isReached: boolean;
  limit?: number;
  settingsHref?: string;
  refetch: () => Promise<unknown>;
}

export const useGlobalLimit = (): GlobalLimit => {
  const { data: quotas, refetch } = useRunQuotas();
  const { application } = useKibana().services;

  return {
    isReached: isGlobalInvestigationLimitReached(quotas),
    limit: quotas?.limits.investigation,
    settingsHref: quotas?.canManage
      ? application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/settings/investigations' })
      : undefined,
    refetch,
  };
};
