/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-service';
import { buildEsQuery, type Filter, type Query } from '@kbn/es-query';
import { useKibana } from '../../common/lib/kibana';
import type { AlertsQueryName } from '../../detections/containers/detection_engine/alerts/use_query';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';
import type { GlobalTimeArgs } from '../../common/containers/use_global_time';

export interface UseCriticalAlerts {
  from: GlobalTimeArgs['from'];
  skip?: boolean;
  signalIndexName: string | null;
  query?: Query;
  filters?: Filter[];
  queryName: AlertsQueryName;
  to: GlobalTimeArgs['to'];
}

export const useAlertCountQuery = ({
  from,
  skip = false,
  signalIndexName,
  query,
  filters,
  queryName,
  to,
}: UseCriticalAlerts): {
  alertCount: number;
  isLoading: boolean;
} => {
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

  const currentQuery = useMemo(
    () => ({
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [...additionalFilters, { range: { '@timestamp': { gte: from, lte: to } } }],
        },
      },
    }),
    [additionalFilters, from, to]
  );

  const {
    data,
    loading: isLoading,
    setQuery,
  } = useQueryAlerts<{}, {}>({
    query: currentQuery,
    indexName: signalIndexName,
    skip,
    queryName,
  });

  useEffect(() => {
    setQuery(currentQuery);
  }, [setQuery, currentQuery]);
  return { alertCount: data?.hits.total.value ?? 0, isLoading };
};
