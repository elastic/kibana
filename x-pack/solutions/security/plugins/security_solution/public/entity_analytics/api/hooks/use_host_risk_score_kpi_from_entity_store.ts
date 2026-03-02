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

export type UseHostRiskScoreKpiFromEntityStoreParams = Omit<
  UseRiskScoreKpiFromEntityStoreParams,
  'entityType'
>;

export type UseHostRiskScoreKpiFromEntityStoreResult = UseRiskScoreKpiFromEntityStoreResult;

/**
 * Hook that fetches host risk score KPI (severity counts) from Entity Store v2.
 * Replaces useRiskScoreKpi for the hosts explore page.
 */
export const useHostRiskScoreKpiFromEntityStore = (
  params: UseHostRiskScoreKpiFromEntityStoreParams
): UseHostRiskScoreKpiFromEntityStoreResult => {
  return useRiskScoreKpiFromEntityStore({ ...params, entityType: 'host' });
};
