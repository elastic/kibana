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
import { useKibana } from '../../../../../common/lib/kibana';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../../containers/detection_engine/alerts/use_query';
import { fetchQueryUnifiedAlerts } from '../../../../containers/detection_engine/alerts/api';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { attacksVolumeAggregations } from './aggregations';
import type { AttacksVolumeAgg, AttacksVolumeBucket } from './types';

export interface UseAttackIdsProps {
  /** Optional array of filters to apply to the query */
  filters?: Filter[];
  /** Optional query object */
  query?: Query;
}

/**
 * Hook for fetching attack IDs
 * @param props - The props for the hook
 * @returns The attack IDs
 */
export const useAttackIds = ({ filters, query }: UseAttackIdsProps) => {
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

  const aggregations = useMemo(() => attacksVolumeAggregations(), []);

  // Get the alerts query
  const alertsQuery = useMemo(
    () => ({
      size: 0,
      query: {
        bool: {
          filter: [...additionalFilters, { range: { '@timestamp': { gte: from, lte: to } } }],
        },
      },
      aggs: aggregations,
    }),
    [additionalFilters, from, to, aggregations]
  );

  // Get the aggregation data
  const {
    data: aggData,
    loading: isAggLoading,
    refetch: refetchAgg,
    setQuery: setAggsQuery,
  } = useQueryAlerts<{}, AttacksVolumeAgg>({
    fetchMethod: fetchQueryUnifiedAlerts,
    query: alertsQuery,
    skip: false,
    queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
  });

  // Set the aggregation query
  useEffect(() => {
    setAggsQuery(alertsQuery);
  }, [alertsQuery, setAggsQuery]);

  // Extract the attack IDs
  const attackIds = useMemo(() => {
    if (!aggData?.aggregations?.attacks_volume?.buckets) return [];
    return aggData.aggregations.attacks_volume.buckets.map((b: AttacksVolumeBucket) => b.key);
  }, [aggData]);

  return {
    attackIds,
    isLoading: isAggLoading,
    refetch: refetchAgg,
  };
};
