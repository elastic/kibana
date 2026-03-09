/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { buildEsQuery } from '@kbn/es-query';
import type { Filter, Query } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import type { AlertsQueryName } from '../../../../containers/detection_engine/alerts/use_query';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { fetchQueryUnifiedAlerts } from '../../../../containers/detection_engine/alerts/api';

export interface UseAlertsAggregationProps {
  /** Optional array of filters to apply to the query */
  filters?: Filter[];
  /** Optional query object */
  query?: Query;
  /** Aggregation body */
  aggs: Record<string, estypes.AggregationsAggregationContainer>;
  /** Name of the query for APM tracking */
  queryName: AlertsQueryName;
  /** Optional size for the query (defaults to 0 as this is an aggregation query) */
  size?: number;
}

/**
 * Generic hook for fetching aggregations from alerts
 * @param props - The props for the hook
 * @returns The query result
 */
export const useAlertsAggregation = <Aggs>({
  filters,
  query,
  aggs,
  queryName,
  size = 0,
}: UseAlertsAggregationProps) => {
  const { from, to } = useGlobalTime();
  const { uiSettings } = useKibana().services;

  const additionalFilters = useMemo(() => {
    try {
      const config = getEsQueryConfig(uiSettings);
      return [
        buildEsQuery(
          undefined,
          query != null ? [query] : [],
          filters?.filter((f) => f.meta.disabled === false) ?? [],
          config
        ),
      ];
    } catch (e) {
      return [];
    }
  }, [query, filters, uiSettings]);

  // Get the alerts query
  const alertsQuery = useMemo(
    () => ({
      size,
      query: {
        bool: {
          filter: [...additionalFilters, { range: { '@timestamp': { gte: from, lte: to } } }],
        },
      },
      aggs,
    }),
    [additionalFilters, from, to, aggs, size]
  );

  // Get the aggregation data
  const { data, loading, refetch, setQuery } = useQueryAlerts<{}, Aggs>({
    fetchMethod: fetchQueryUnifiedAlerts,
    query: alertsQuery,
    skip: false,
    queryName,
  });

  // Set the aggregation query
  useEffect(() => {
    setQuery(alertsQuery);
  }, [alertsQuery, setQuery]);

  return {
    data,
    loading,
    refetch,
  };
};
