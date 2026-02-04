/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EMPTY_SEVERITY_COUNT } from '../../../../common/search_strategy';
import { useRiskScoreKpi } from '../../api/hooks/use_risk_score_kpi';
import { useGlobalFilterQuery } from '../../../common/hooks/use_global_filter_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { SeverityCount } from '../severity/types';

interface UseCombinedRiskScoreKpiResult {
  severityCount: SeverityCount;
  loading: boolean;
  error: unknown;
  isModuleDisabled: boolean;
  refetch: () => void;
}

/**
 * Hook that aggregates risk score KPI data from all three entity types (user, host, service)
 * into a combined severity count for display in the threat hunting donut chart.
 */
export const useCombinedRiskScoreKpi = (skip?: boolean): UseCombinedRiskScoreKpiResult => {
  const { from, to } = useGlobalTime();
  const { filterQuery } = useGlobalFilterQuery();

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  // Memoize entity array to prevent re-creation on every render
  const entityTypes = useMemo(() => [EntityType.user, EntityType.host, EntityType.service], []);

  // Query all three entity types in a single call
  const combinedRiskKpi = useRiskScoreKpi({
    filterQuery,
    skip,
    riskEntity: entityTypes,
    timerange,
  });

  const loading = combinedRiskKpi.loading;
  const error = combinedRiskKpi.error;
  const isModuleDisabled = combinedRiskKpi.isModuleDisabled;

  const refetch = () => {
    combinedRiskKpi.refetch();
  };

  return {
    severityCount: combinedRiskKpi.severityCount ?? EMPTY_SEVERITY_COUNT,
    loading,
    error,
    isModuleDisabled,
    refetch,
  };
};
