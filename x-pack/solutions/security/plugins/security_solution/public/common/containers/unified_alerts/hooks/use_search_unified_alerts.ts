/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';

import type { SearchUnifiedAlertsRequestBody } from '../../../../../common/api/detection_engine/unified_alerts';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { searchUnifiedAlerts } from '../api';

import * as i18n from './translations';
import { DEFAULT_QUERY_OPTIONS, SEARCH_UNIFIED_ALERTS_QUERY_KEY } from './constants';

/**
 * Hook for searching unified alerts (detection and attack alerts) using React Query.
 * Provides automatic caching, error handling, and loading states.
 *
 * @param query - The Elasticsearch query DSL object to search unified alerts
 * @returns React Query result object with data, loading state, error, and refetch function
 */
export const useSearchUnifiedAlerts = (query: SearchUnifiedAlertsRequestBody) => {
  const { addError } = useAppToasts();

  return useQuery(
    [...SEARCH_UNIFIED_ALERTS_QUERY_KEY, query],
    async ({ signal }) => {
      const response = await searchUnifiedAlerts({
        query,
        signal,
      });

      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.SEARCH_UNIFIED_ALERTS_FAILURE });
      },
    }
  );
};

/**
 * We should use this hook to invalidate the unified alerts search cache. For
 * example, unified alerts mutations, like setting workflow status, tags, or assignees,
 * should lead to cache invalidation.
 *
 * @returns A unified alerts search cache invalidation callback
 */
export const useInvalidateSearchUnifiedAlerts = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    /**
     * Invalidate all queries that start with SEARCH_UNIFIED_ALERTS_QUERY_KEY. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(SEARCH_UNIFIED_ALERTS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
