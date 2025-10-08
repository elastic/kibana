/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { replaceParams } from '@kbn/openapi-common/shared';
import {
  ATTACK_DISCOVERY_SCHEDULES_BY_ID,
  transformAttackDiscoveryScheduleFromApi,
} from '@kbn/elastic-assistant-common';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { getAttackDiscoverySchedule } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibanaFeatureFlags } from '../../../use_kibana_feature_flags';
import { toAttackDiscoverySchedule } from './schedule_type_guards';

export const useGetAttackDiscoverySchedule = (params: { id: string }) => {
  const { addError } = useAppToasts();
  const { attackDiscoveryPublicApiEnabled } = useKibanaFeatureFlags();

  const { id } = params;
  const SPECIFIC_PATH = replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id });

  return useQuery(
    ['GET', SPECIFIC_PATH, params],
    async ({ signal }) => {
      const response = await getAttackDiscoverySchedule({
        attackDiscoveryPublicApiEnabled,
        signal,
        ...params,
      });

      // Public API returns snake_case and needs transformation to camelCase
      // Internal API returns camelCase
      const normalizedSchedule: AttackDiscoverySchedule = attackDiscoveryPublicApiEnabled
        ? transformAttackDiscoveryScheduleFromApi(response)
        : toAttackDiscoverySchedule(response);

      return { schedule: normalizedSchedule };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
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
export const useInvalidateGetAttackDiscoverySchedule = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (id: string) => {
      const SPECIFIC_PATH = replaceParams(ATTACK_DISCOVERY_SCHEDULES_BY_ID, { id });

      /**
       * Invalidate all queries that start with SPECIFIC_PATH. This
       * includes the in-memory query cache and paged query cache.
       */
      queryClient.invalidateQueries(['GET', SPECIFIC_PATH], {
        refetchType: 'active',
      });
    },
    [queryClient]
  );
};
