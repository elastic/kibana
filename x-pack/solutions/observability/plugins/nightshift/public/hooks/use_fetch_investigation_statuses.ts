/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { InvestigationRunStatus } from '@kbn/significant-events-schema';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_INVESTIGATION_STATUSES_QUERY_KEY = [
  'nightshift.investigationStatuses',
] as const;

const PENDING_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;

const MAX_INVESTIGATION_STATUS_IDS = 1000;

export const useFetchInvestigationStatuses = (
  workflowExecutionIds: string[]
): UseQueryResult<Record<string, InvestigationRunStatus>, Error> => {
  const {
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;

  const ids = useMemo(
    () =>
      [...new Set(workflowExecutionIds.filter(Boolean))]
        .sort()
        .slice(0, MAX_INVESTIGATION_STATUS_IDS),
    [workflowExecutionIds]
  );

  return useQuery<Record<string, InvestigationRunStatus>, Error>({
    queryKey: [...NIGHTSHIFT_INVESTIGATION_STATUSES_QUERY_KEY, ids],
    enabled: ids.length > 0,
    queryFn: async ({ signal }) => {
      const { statuses } = await significantEventsRepositoryClient.fetch(
        'POST /internal/significant_events/investigations/_status',
        {
          params: { body: { workflow_execution_ids: ids } },
          signal: signal ?? null,
        }
      );
      return statuses;
    },
    refetchInterval: (data) =>
      Object.values(data ?? {}).some((status) => status === 'pending')
        ? PENDING_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
  });
};
