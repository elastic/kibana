/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, buildQueryFromFilters } from '@kbn/es-query';
import { FindSLOHealthParams, FindSLOHealthResponse } from '@kbn/slo-schema';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { HEALTH_INDEX_PATTERN } from '../../../../common/constants';
import { sloKeys } from '../../../hooks/query_key_factory';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { usePluginContext } from '../../../hooks/use_plugin_context';

interface UseFetchSloHealth {
  data: FindSLOHealthResponse | undefined;
  isLoading: boolean;
  isError: boolean;
}

type Props = Omit<FindSLOHealthParams, 'filters' | 'page' | 'size'> & {
  filters?: Filter[];
  page: number;
  size: number;
};

export function useFetchSloHealth(params: Props): UseFetchSloHealth {
  const { query, filters = [], sortBy, sortDirection, searchAfter, page, size } = params;
  const { sloClient } = usePluginContext();

  const { dataView } = useCreateDataView({
    indexPatternString: HEALTH_INDEX_PATTERN,
  });
  const stringifiedFilters = useMemo(() => {
    if (filters.length === 0) {
      return undefined;
    }
    try {
      return JSON.stringify(
        buildQueryFromFilters(filters, dataView, {
          ignoreFilterIfFieldNotInIndex: true,
        })
      );
    } catch (e) {
      return undefined;
    }
  }, [filters, dataView]);

  const { isLoading, isError, data } = useQuery({
    queryKey: sloKeys.managementHealth(params),
    queryFn: async ({ signal }) => {
      try {
        return await sloClient.fetch('GET /api/observability/slos/management/health', {
          params: {
            query: {
              query,
              filters: stringifiedFilters,
              sortBy,
              sortDirection,
              searchAfter,
              size: String(size),
              page: String(page),
            },
          },
          signal,
        });
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  return {
    data,
    isLoading,
    isError,
  };
}
