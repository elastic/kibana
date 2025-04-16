/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ATTACK_DISCOVERY_SCHEDULES_FIND } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { findAttackDiscoverySchedule } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

export const useFindAttackDiscoverySchedules = (params?: {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}) => {
  const { addError } = useAppToasts();

  return useQuery(
    ['GET', ATTACK_DISCOVERY_SCHEDULES_FIND, params],
    async ({ signal }) => {
      const response = await findAttackDiscoverySchedule({ signal, ...params });

      return { schedules: response.data, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ATTACK_DISCOVERY_SCHEDULES_FAILURE(false) });
      },
    }
  );
};

/**
 * We should use this hook to invalidate the attack discovery schedule cache. For
 * example, attack discovery schedule mutations, like create a schedule, should lead to cache invalidation.
 *
 * @returns A attack discovery schedule cache invalidation callback
 */
export const useInvalidateFindAttackDiscoverySchedule = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    /**
     * Invalidate all queries that start with ATTACK_DISCOVERY_SCHEDULES_FIND. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(['GET', ATTACK_DISCOVERY_SCHEDULES_FIND], {
      refetchType: 'active',
    });
  }, [queryClient]);
};
