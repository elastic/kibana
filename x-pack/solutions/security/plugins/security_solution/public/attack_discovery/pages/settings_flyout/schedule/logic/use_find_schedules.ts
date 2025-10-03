/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND,
  ATTACK_DISCOVERY_SCHEDULES_FIND,
  transformAttackDiscoveryScheduleFromApi,
} from '@kbn/elastic-assistant-common';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { findAttackDiscoverySchedule } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';
import { toAttackDiscoveryScheduleArray } from './schedule_type_guards';

export const useFindAttackDiscoverySchedules = (params?: {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  disableToast?: boolean;
}) => {
  const { addError } = useAppToasts();
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const { disableToast, ...restParams } = params ?? {};

  const route = attackDiscoveryPublicApiEnabled
    ? ATTACK_DISCOVERY_SCHEDULES_FIND
    : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND;

  return useQuery(
    ['GET', route, params],
    async ({ signal }) => {
      const response = await findAttackDiscoverySchedule({
        attackDiscoveryPublicApiEnabled,
        signal,
        ...restParams,
      });

      // Public API returns snake_case and needs transformation to camelCase
      // Internal API returns camelCase
      const normalizedSchedules: AttackDiscoverySchedule[] = attackDiscoveryPublicApiEnabled
        ? response.data.map(transformAttackDiscoveryScheduleFromApi)
        : toAttackDiscoveryScheduleArray(response.data);

      return { schedules: normalizedSchedules, total: response.total };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        if (!disableToast) {
          addError(error, { title: i18n.FETCH_ATTACK_DISCOVERY_SCHEDULES_FAILURE(false) });
        }
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
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  return useCallback(() => {
    const route = attackDiscoveryPublicApiEnabled
      ? ATTACK_DISCOVERY_SCHEDULES_FIND
      : ATTACK_DISCOVERY_INTERNAL_SCHEDULES_FIND;

    /**
     * Invalidate all queries that start with ATTACK_DISCOVERY_SCHEDULES_FIND. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(['GET', route], {
      refetchType: 'active',
    });
  }, [attackDiscoveryPublicApiEnabled, queryClient]);
};
