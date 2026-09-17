/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';

import type { SearchAttacksRequestBody } from '../../../../../common/api/detection_engine/attacks';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import type { inputsModel } from '../../../store';
import { inputsSelectors } from '../../../store';
import { searchAttacks } from '../api';

import * as i18n from './translations';
import { DEFAULT_QUERY_OPTIONS, SEARCH_ATTACKS_QUERY_KEY } from './constants';

/**
 * Hook for searching attacks using React Query.
 * Provides automatic caching, error handling, and loading states.
 *
 * @param query - The Elasticsearch query DSL object to search attacks
 * @returns React Query result object with data, loading state, error, and refetch function
 */
export const useSearchAttacks = (query: SearchAttacksRequestBody) => {
  const { addError } = useAppToasts();

  return useQuery(
    [...SEARCH_ATTACKS_QUERY_KEY, query],
    async ({ signal }) => {
      const response = await searchAttacks({
        query,
        signal,
      });

      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.SEARCH_ATTACKS_FAILURE });
      },
    }
  );
};

/**
 * We should use this hook to refresh attacks page search after mutations.
 * Invalidates React Query caches and refetches global queries registered via
 * `useInspectButton` (attacks table grouping and KPI hooks).
 *
 * @returns A callback to refresh attacks search data
 */
export const useInvalidateSearchAttacks = () => {
  const queryClient = useQueryClient();
  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuery(), []);
  const globalQueries = useDeepEqualSelector(getGlobalQuerySelector);

  return useCallback(() => {
    queryClient.invalidateQueries(SEARCH_ATTACKS_QUERY_KEY, {
      refetchType: 'active',
    });
    globalQueries.forEach((q) => q.refetch && (q.refetch as inputsModel.Refetch)());
  }, [queryClient, globalQueries]);
};
