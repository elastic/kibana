/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { EMPTY_SEVERITY_COUNT, RiskSeverity } from '../../../../common/search_strategy';
import type { SeverityCount } from '../../components/severity/types';
import { useEntityAnalyticsRoutes } from '../api';
import {
  transformFilterForEntityStore,
  buildEntityStoreRiskFilter,
  mergeFilters,
} from './use_risk_scores_from_entity_store_utils';
import type { EntityRiskFieldPrefix } from './use_risk_scores_from_entity_store_utils';

const ENTITY_STORE_KPI = 'ENTITY_STORE_KPI';

export interface UseRiskScoreKpiFromEntityStoreParams {
  entityType: 'host' | 'user';
  filterQuery?: string;
  skip?: boolean;
}

export interface UseRiskScoreKpiFromEntityStoreResult {
  severityCount: SeverityCount;
  loading: boolean;
  refetch: () => void;
}

/**
 * Generic hook for fetching risk score KPI (severity counts) from Entity Store v2.
 * Used by useHostRiskScoreKpiFromEntityStore and useUserRiskScoreKpiFromEntityStore.
 */
export const useRiskScoreKpiFromEntityStore = ({
  entityType,
  filterQuery,
  skip = false,
}: UseRiskScoreKpiFromEntityStoreParams): UseRiskScoreKpiFromEntityStoreResult => {
  const { fetchEntitiesKpi } = useEntityAnalyticsRoutes();
  const fieldPrefix: EntityRiskFieldPrefix = entityType;

  const entityFilterQuery = useMemo(() => {
    const transformed = transformFilterForEntityStore(filterQuery, fieldPrefix);
    const baseFilter = buildEntityStoreRiskFilter();
    return mergeFilters(baseFilter, transformed);
  }, [filterQuery, fieldPrefix]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [ENTITY_STORE_KPI, entityType, entityFilterQuery],
    queryFn: () =>
      fetchEntitiesKpi({
        params: {
          entityTypes: [entityType],
          filterQuery: entityFilterQuery,
        },
      }),
    enabled: !skip,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const severityCount = useMemo((): SeverityCount => {
    if (isLoading || !data?.severityCount) {
      return EMPTY_SEVERITY_COUNT;
    }
    const raw = data.severityCount;
    return {
      [RiskSeverity.Unknown]: raw[RiskSeverity.Unknown] ?? 0,
      [RiskSeverity.Low]: raw[RiskSeverity.Low] ?? 0,
      [RiskSeverity.Moderate]: raw[RiskSeverity.Moderate] ?? 0,
      [RiskSeverity.High]: raw[RiskSeverity.High] ?? 0,
      [RiskSeverity.Critical]: raw[RiskSeverity.Critical] ?? 0,
    };
  }, [data?.severityCount, isLoading]);

  return {
    severityCount,
    loading: isLoading,
    refetch: refetch as () => void,
  };
};
