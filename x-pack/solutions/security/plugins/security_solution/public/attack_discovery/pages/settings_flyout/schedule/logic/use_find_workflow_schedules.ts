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
import { findWorkflowSchedules, INTERNAL_SCHEDULES_FIND } from '../api/internal';
import { DEFAULT_QUERY_OPTIONS } from './constants';
import { transformAttackDiscoveryScheduleToAttackDiscoverySchedule } from './transform_attack_discovery_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';

/**
 * NOTE: Despite the "Workflow" in its name, this hook lists alerting rules (not workflow
 * definitions) via the internal API at `/internal/attack_discovery/schedules/_find`.
 * The "workflow" prefix is a historical artifact; renaming is deferred to a follow-up PR
 * (Option C: Hybrid Scheduling Migration).
 */
export const useFindWorkflowSchedules = (params?: {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  disableToast?: boolean;
}) => {
  const { addError } = useAppToasts();

  const { disableToast, ...restParams } = params ?? {};

  return useQuery(
    ['GET', INTERNAL_SCHEDULES_FIND, params],
    async ({ signal }) => {
      const response = await findWorkflowSchedules({
        signal,
        ...restParams,
      });

      const schedules: AttackDiscoverySchedule[] = response.data.map(
        transformAttackDiscoveryScheduleToAttackDiscoverySchedule
      );

      return { schedules, total: response.total };
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

export const useInvalidateFindWorkflowSchedules = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(['GET', INTERNAL_SCHEDULES_FIND], {
      refetchType: 'active',
    });
  }, [queryClient]);
};
