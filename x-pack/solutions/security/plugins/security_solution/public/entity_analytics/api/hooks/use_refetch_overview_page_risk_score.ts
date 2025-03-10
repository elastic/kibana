/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { useCallback } from 'react';
import type { Refetch } from '../../../common/types';
import { useRefetchQueryById } from './use_refetch_query_by_id';

export const useRefetchOverviewPageRiskScore = (overviewRiskScoreQueryId: string) => {
  const refetchOverviewRiskScore = useRefetchQueryById(overviewRiskScoreQueryId);
  const refetchAlertsRiskInputs = useRefetchQueryById(TableId.alertsRiskInputs);

  const refetchRiskScore = useCallback(() => {
    if (refetchOverviewRiskScore) {
      (refetchOverviewRiskScore as Refetch)();
    }

    if (refetchAlertsRiskInputs) {
      (refetchAlertsRiskInputs as Refetch)();
    }
  }, [refetchAlertsRiskInputs, refetchOverviewRiskScore]);
  return refetchRiskScore;
};
