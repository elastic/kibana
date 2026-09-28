/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@kbn/react-query';
import type { AttackDiscoverySchedule } from '@kbn/elastic-assistant-common';

import * as i18n from './translations';
import { getWorkflowSchedule, INTERNAL_SCHEDULES_BY_ID } from '../api/internal';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { transformAttackDiscoveryScheduleToAttackDiscoverySchedule } from './transform_attack_discovery_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

const replaceId = (template: string, id: string): string => template.replace('{id}', id);

/**
 * NOTE: Despite the "Workflow" in its name, this hook fetches an alerting rule (not a
 * workflow definition) via the internal API at `/internal/attack_discovery/schedules/{id}`.
 * The "workflow" prefix is a historical artifact; renaming is deferred to a follow-up PR
 * (Option C: Hybrid Scheduling Migration).
 */
export const useGetWorkflowSchedule = (params: { id: string }) => {
  const { addError } = useAppToasts();

  const { id } = params;
  const SPECIFIC_PATH = replaceId(INTERNAL_SCHEDULES_BY_ID, id);

  return useQuery(
    ['GET', SPECIFIC_PATH, params],
    async ({ signal }) => {
      const response = await getWorkflowSchedule({
        signal,
        ...params,
      });

      const schedule: AttackDiscoverySchedule =
        transformAttackDiscoveryScheduleToAttackDiscoverySchedule(response);

      return { schedule };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ATTACK_DISCOVERY_SCHEDULES_FAILURE() });
      },
    }
  );
};

export const useInvalidateGetWorkflowSchedule = () => {
  const queryClient = useQueryClient();

  return useCallback(
    (id: string) => {
      const SPECIFIC_PATH = replaceId(INTERNAL_SCHEDULES_BY_ID, id);

      queryClient.invalidateQueries(['GET', SPECIFIC_PATH], {
        refetchType: 'active',
      });
    },
    [queryClient]
  );
};
