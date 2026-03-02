/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  useRiskScoreKpiFromEntityStore,
  type UseRiskScoreKpiFromEntityStoreParams,
  type UseRiskScoreKpiFromEntityStoreResult,
} from './use_risk_score_kpi_from_entity_store';

export type UseUserRiskScoreKpiFromEntityStoreParams = Omit<
  UseRiskScoreKpiFromEntityStoreParams,
  'entityType'
>;

export type UseUserRiskScoreKpiFromEntityStoreResult = UseRiskScoreKpiFromEntityStoreResult;

/**
 * Hook that fetches user risk score KPI (severity counts) from Entity Store v2.
 * Replaces useRiskScoreKpi for the users explore page.
 */
export const useUserRiskScoreKpiFromEntityStore = (
  params: UseUserRiskScoreKpiFromEntityStoreParams
): UseUserRiskScoreKpiFromEntityStoreResult => {
  return useRiskScoreKpiFromEntityStore({ ...params, entityType: 'user' });
};
