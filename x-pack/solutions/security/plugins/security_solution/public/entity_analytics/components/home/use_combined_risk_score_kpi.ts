/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';
import { EntityType } from '../../../../common/entity_analytics/types';
import { EMPTY_SEVERITY_COUNT, RiskSeverity } from '../../../../common/search_strategy';
import { useRiskScoreKpi } from '../../api/hooks/use_risk_score_kpi';
import { useEntityStoreRiskScoreKpi } from '../../api/hooks/use_entity_store_risk_score_kpi';
import { useGlobalFilterQuery } from '../../../common/hooks/use_global_filter_query';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useUiSetting } from '../../../common/lib/kibana';
import type { SeverityCount } from '../severity/types';

const mergeSeverityCounts = (
  a: SeverityCount | undefined,
  b: SeverityCount | undefined
): SeverityCount => ({
  [RiskSeverity.Unknown]: (a?.[RiskSeverity.Unknown] ?? 0) + (b?.[RiskSeverity.Unknown] ?? 0),
  [RiskSeverity.Low]: (a?.[RiskSeverity.Low] ?? 0) + (b?.[RiskSeverity.Low] ?? 0),
  [RiskSeverity.Moderate]: (a?.[RiskSeverity.Moderate] ?? 0) + (b?.[RiskSeverity.Moderate] ?? 0),
  [RiskSeverity.High]: (a?.[RiskSeverity.High] ?? 0) + (b?.[RiskSeverity.High] ?? 0),
  [RiskSeverity.Critical]: (a?.[RiskSeverity.Critical] ?? 0) + (b?.[RiskSeverity.Critical] ?? 0),
});

interface UseCombinedRiskScoreKpiResult {
  severityCount: SeverityCount;
  loading: boolean;
  error: unknown;
  isModuleDisabled: boolean;
  refetch: () => void;
}

interface UseCombinedRiskScoreKpiOptions {
  /**
   * Optional override for the time range used by the underlying KPI queries.
   * When provided, the global date picker is ignored and the supplied range
   * is used instead. Useful on pages where the global date picker is hidden
   * or the chart should show all-time data.
   */
  timerangeOverride?: { from: string; to: string };
}

/**
 * Hook that aggregates risk score KPI data from all three entity types (user, host, service)
 * into a combined severity count for display in the entity analytics home page donut chart.
 */
export const useCombinedRiskScoreKpi = (
  skip?: boolean,
  options?: UseCombinedRiskScoreKpiOptions
): UseCombinedRiskScoreKpiResult => {
  const { from: globalFrom, to: globalTo } = useGlobalTime();
  const { filterQuery } = useGlobalFilterQuery();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2) === true;

  const overrideFrom = options?.timerangeOverride?.from;
  const overrideTo = options?.timerangeOverride?.to;
  const from = overrideFrom ?? globalFrom;
  const to = overrideTo ?? globalTo;

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  // Memoize entity array to prevent re-creation on every render
  const entityTypes = useMemo(() => [EntityType.user, EntityType.host, EntityType.service], []);

  // Query all three entity types in a single call (legacy risk-score indices)
  const combinedRiskKpi = useRiskScoreKpi({
    filterQuery,
    skip: skip || entityStoreV2Enabled,
    riskEntity: entityTypes,
    timerange,
  });

  const hostStoreKpi = useEntityStoreRiskScoreKpi({
    filterQuery,
    skip: skip || !entityStoreV2Enabled,
    riskEntity: EntityType.host,
    timerange,
  });

  const userStoreKpi = useEntityStoreRiskScoreKpi({
    filterQuery,
    skip: skip || !entityStoreV2Enabled,
    riskEntity: EntityType.user,
    timerange,
  });

  const loading = entityStoreV2Enabled
    ? hostStoreKpi.loading || userStoreKpi.loading
    : combinedRiskKpi.loading;
  const error = entityStoreV2Enabled
    ? hostStoreKpi.error ?? userStoreKpi.error
    : combinedRiskKpi.error;
  const isModuleDisabled = entityStoreV2Enabled
    ? hostStoreKpi.isModuleDisabled && userStoreKpi.isModuleDisabled
    : combinedRiskKpi.isModuleDisabled;

  const refetch = useCallback(() => {
    if (entityStoreV2Enabled) {
      hostStoreKpi.refetch();
      userStoreKpi.refetch();
    } else {
      combinedRiskKpi.refetch();
    }
  }, [combinedRiskKpi, entityStoreV2Enabled, hostStoreKpi, userStoreKpi]);

  const severityCount = entityStoreV2Enabled
    ? mergeSeverityCounts(hostStoreKpi.severityCount, userStoreKpi.severityCount)
    : combinedRiskKpi.severityCount ?? EMPTY_SEVERITY_COUNT;

  return {
    severityCount,
    loading,
    error,
    isModuleDisabled,
    refetch,
  };
};
