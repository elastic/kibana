/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import type { InvestigationRunStatus } from '@kbn/significant-events-schema';
import type { InvestigationStatus } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from './use_kibana';

export const NIGHTSHIFT_INVESTIGATION_STATUSES_QUERY_KEY = [
  'nightshift.investigationStatuses',
] as const;

const PENDING_INVESTIGATIONS_REFETCH_INTERVAL_MS = 5_000;

const MAX_INVESTIGATION_STATUS_IDS = 1000;

const toRunStatus = (status: InvestigationStatus): InvestigationRunStatus => {
  switch (status) {
    case 'pending':
    case 'running':
      return 'pending';
    case 'completed':
      return 'complete';
    case 'failed':
    case 'cancelled':
      return 'failed';
  }
};

export const useFetchInvestigationStatuses = (
  workflowExecutionIds: string[]
): UseQueryResult<Record<string, InvestigationRunStatus>, Error> => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  const ids = useMemo(
    () =>
      [...new Set(workflowExecutionIds.filter(Boolean))]
        .sort()
        .slice(0, MAX_INVESTIGATION_STATUS_IDS),
    [workflowExecutionIds]
  );

  return useQuery<Record<string, InvestigationRunStatus>, Error>({
    queryKey: [...NIGHTSHIFT_INVESTIGATION_STATUSES_QUERY_KEY, ids],
    enabled: ids.length > 0 && investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      const { statuses } = await investigationsClient.fetch(
        'POST /internal/nightshift/investigations/_status',
        {
          params: { body: { investigation_ids: ids } },
          signal: signal ?? null,
        }
      );
      const mapped: Record<string, InvestigationRunStatus> = {};
      for (const [id, status] of Object.entries(statuses)) {
        mapped[id] = toRunStatus(status);
      }
      return mapped;
    },
    refetchInterval: (data) =>
      Object.values(data ?? {}).some((status) => status === 'pending')
        ? PENDING_INVESTIGATIONS_REFETCH_INTERVAL_MS
        : false,
  });
};
