/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  GapAutoFillSchedulerRequestBodyV1,
  GapAutoFillSchedulerResponseBodyV1,
  UpdateGapAutoFillSchedulerRequestBodyV1,
} from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import {
  createGapAutoFillScheduler,
  getGapAutoFillScheduler,
  updateGapAutoFillScheduler,
  getGapAutoFillSchedulerLogs,
} from '../api';

const getSchedulerId = (spaceId?: string) =>
  spaceId ? `security-solution-gap-auto-fill-scheduler-${spaceId}` : 'default';

export const useGetGapAutoFillScheduler = () => {
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);
  const queryKey = useMemo(() => ['GET', 'gap_auto_fill_scheduler', schedulerId], [schedulerId]);

  return useQuery<GapAutoFillSchedulerResponseBodyV1, Error>({
    queryKey,
    queryFn: ({ signal }) => getGapAutoFillScheduler({ id: schedulerId, signal }),
  });
};

export const useCreateGapAutoFillScheduler = () => {
  const queryClient = useQueryClient();
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);
  const queryKey = useMemo(() => ['GET', 'gap_auto_fill_scheduler', schedulerId], [schedulerId]);

  return useMutation(
    (body: { enabled: boolean; schedule: { interval: string } }) => {
      const fullBody: GapAutoFillSchedulerRequestBodyV1 = {
        id: schedulerId,
        name: '',
        enabled: body.enabled,
        gap_fill_range: 'now-7d',
        schedule: body.schedule,
        rule_types: SECURITY_SOLUTION_RULE_TYPE_IDS.map((typeId) => ({
          type: typeId,
          consumer: 'siem',
        })),
        max_amount_of_gaps_to_process_per_run: 100, // set appropriate default or configurable value
        max_amount_of_rules_to_process_per_run: 100, // set appropriate default or configurable value
        amount_of_retries: 3, // set appropriate default or configurable value
      };
      return createGapAutoFillScheduler(fullBody);
    },
    {
      mutationKey: ['POST', 'gap_auto_fill_scheduler'],
      onSettled: () => {
        queryClient.invalidateQueries(queryKey);
      },
    }
  );
};

export const useGetGapAutoFillSchedulerLogs = ({
  page,
  perPage,
  start,
  end,
  sort,
  filter,
}: {
  page: number;
  perPage: number;
  start?: string;
  end?: string;
  sort?: { field: string; direction: 'asc' | 'desc' };
  filter?: string;
}) => {
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);
  const queryKey = useMemo(
    () => ['GET', 'gap_auto_fill_scheduler_logs', schedulerId, page, perPage, start, end, sort, filter],
    [schedulerId, page, perPage, start, end, sort, filter]
  );

  return useQuery<GapAutoFillSchedulerLogsResponseBodyV1, Error>({
    queryKey,
    queryFn: ({ signal }) =>
      getGapAutoFillSchedulerLogs({
        id: schedulerId,
        page,
        perPage,
        start,
        end,
        sort,
        filter,
        signal,
      }),
    keepPreviousData: true,
  });
};

export const useUpdateGapAutoFillScheduler = () => {
  const queryClient = useQueryClient();
  const spaceId = useSpaceId();
  const schedulerId = getSchedulerId(spaceId);
  const queryKey = useMemo(() => ['GET', 'gap_auto_fill_scheduler', schedulerId], [schedulerId]);

  return useMutation(
    (body: UpdateGapAutoFillSchedulerRequestBodyV1) =>
      updateGapAutoFillScheduler({ id: schedulerId, body }),
    {
      mutationKey: ['PUT', 'gap_auto_fill_scheduler', schedulerId],
      onSettled: () => {
        queryClient.invalidateQueries(queryKey);
      },
    }
  );
};
