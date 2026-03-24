/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { GapAutoFillSchedulerResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '@kbn/security-solution-features/constants';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import {
  createGapAutoFillScheduler,
  getGapAutoFillScheduler,
  findGapAutoFillSchedulerLogs,
  updateGapAutoFillScheduler,
} from '../api';
import type { GapAutoFillSchedulerResponse, GapAutoFillSchedulerBase } from '../../types';
import {
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_GAP_FILL_RANGE,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_INTERVAL,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_MAX_BACKFILLS,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_NUM_RETRIES,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_SCOPE,
  DEFAULT_GAP_AUTO_FILL_SCHEDULER_ID_PREFIX,
  defaultRangeValue,
} from '../../constants';
import { getGapRange } from './utils';

const transformGapAutoFillSchedulerResponseBody = (
  response: GapAutoFillSchedulerResponseBodyV1
): GapAutoFillSchedulerResponse => {
  return {
    id: response.id,
    name: response.name,
    enabled: response.enabled,
    gapFillRange: response.gap_fill_range,
    maxBackfills: response.max_backfills,
    numRetries: response.num_retries,
    schedule: {
      interval: response.schedule.interval,
    },
    scope: response.scope,
    ruleTypes: response.rule_types,
    createdBy: response.created_by,
    updatedBy: response.updated_by,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
};

const getSchedulerId = (spaceId?: string) =>
  spaceId ? `${DEFAULT_GAP_AUTO_FILL_SCHEDULER_ID_PREFIX}-${spaceId}` : 'default';

export const useGetGapAutoFillScheduler = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);

  return useQuery<GapAutoFillSchedulerResponse, Error>(
    ['GET', 'gap_auto_fill_scheduler', schedulerId],
    async ({ signal }) => {
      const response = await getGapAutoFillScheduler({ id: schedulerId, signal });
      return transformGapAutoFillSchedulerResponseBody(response);
    },
    { enabled, refetchOnWindowFocus: false, retry: false }
  );
};

export const useCreateGapAutoFillScheduler = () => {
  const queryClient = useQueryClient();
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);

  return useMutation(
    async () => {
      const fullBody = {
        id: schedulerId,
        name: '',
        enabled: true,
        gapFillRange: DEFAULT_GAP_AUTO_FILL_SCHEDULER_GAP_FILL_RANGE,
        ruleTypes: SECURITY_SOLUTION_RULE_TYPE_IDS.map((typeId) => ({
          type: typeId,
          consumer: SERVER_APP_ID,
        })),
        schedule: {
          interval: DEFAULT_GAP_AUTO_FILL_SCHEDULER_INTERVAL,
        },
        maxBackfills: DEFAULT_GAP_AUTO_FILL_SCHEDULER_MAX_BACKFILLS,
        numRetries: DEFAULT_GAP_AUTO_FILL_SCHEDULER_NUM_RETRIES,
        scope: DEFAULT_GAP_AUTO_FILL_SCHEDULER_SCOPE,
      };
      const response = await createGapAutoFillScheduler(fullBody);
      return transformGapAutoFillSchedulerResponseBody(response);
    },
    {
      mutationKey: ['POST', 'gap_auto_fill_scheduler'],
      onSettled: () => {
        queryClient.invalidateQueries(['GET', 'gap_auto_fill_scheduler', schedulerId]);
      },
    }
  );
};

export const useUpdateGapAutoFillScheduler = () => {
  const queryClient = useQueryClient();
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);

  return useMutation((body: GapAutoFillSchedulerBase) => updateGapAutoFillScheduler(body), {
    mutationKey: ['PUT', 'gap_auto_fill_scheduler', schedulerId],
    onSettled: () => {
      queryClient.invalidateQueries(['GET', 'gap_auto_fill_scheduler', schedulerId]);
    },
  });
};

export const useFindGapAutoFillSchedulerLogs = ({
  page,
  perPage,
  sortField,
  sortDirection,
  statuses,
  enabled,
  staleTime,
}: {
  page: number;
  perPage: number;
  sortField: string;
  sortDirection: string;
  statuses: string[];
  enabled: boolean;
  staleTime?: number;
}) => {
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);

  return useQuery(
    [
      'GET',
      'gap_auto_fill_scheduler_logs',
      schedulerId,
      page,
      perPage,
      sortField,
      sortDirection,
      ...statuses,
    ],
    async ({ signal }) => {
      const { start, end } = getGapRange(defaultRangeValue);

      const response = await findGapAutoFillSchedulerLogs({
        id: schedulerId,
        signal,
        start,
        end,
        page,
        perPage,
        sortField,
        sortDirection,
        statuses,
      });

      return {
        data: response?.data?.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          status: log.status,
          message: log.message,
          results: log.results?.map((result) => ({
            ruleId: result.rule_id,
            processedGaps: result.processed_gaps,
            status: result.status,
            error: result.error,
          })),
        })),
        total: response.total,
        page: response.page,
        perPage: response.per_page,
      };
    },
    {
      enabled,
      staleTime,
    }
  );
};
