/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { fromApiLead } from './types';
import * as i18n from './translations';

const HUNTING_LEADS_QUERY_KEY = 'hunting-leads';
const LEAD_SCHEDULE_QUERY_KEY = 'lead-generation-status';

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 30;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const FETCH_LEADS_PARAMS = {
  params: {
    page: 1 as const,
    perPage: 10 as const,
    sortField: 'priority' as const,
    sortOrder: 'desc' as const,
    status: 'active' as const,
  },
};

export const useHuntingLeads = (connectorId: string, isEnabled: boolean = true) => {
  const {
    fetchLeads,
    generateLeads: generateLeadsApi,
    fetchLeadGenerationStatus,
    enableLeadGeneration,
    disableLeadGeneration,
  } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError, addWarning } = useAppToasts();
  const abortCtrl = useRef(new AbortController());
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    return () => {
      abortCtrl.current.abort();
    };
  }, []);

  const {
    data,
    isLoading: isLeadsLoading,
    refetch,
  } = useQuery({
    queryKey: [HUNTING_LEADS_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeads({ signal, ...FETCH_LEADS_PARAMS }),
    enabled: isEnabled,
    onError: (error: Error) => addError(error, { title: i18n.FETCH_LEADS_ERROR }),
  });

  const pollForCompletion = useCallback(
    async (executionUuid: string, signal: AbortSignal): Promise<'success' | 'timeout'> => {
      for (let i = 0; i < MAX_POLLS; i++) {
        if (signal.aborted) return 'timeout';
        await delay(POLL_INTERVAL_MS);
        if (signal.aborted) return 'timeout';

        const status = await fetchLeadGenerationStatus({ signal });
        if (status.lastExecutionUuid === executionUuid) {
          if (status.lastError) {
            throw new Error(status.lastError);
          }

          const result = await fetchLeads({ ...FETCH_LEADS_PARAMS, signal });
          queryClient.setQueryData([HUNTING_LEADS_QUERY_KEY], result);
          return 'success';
        }
      }
      return 'timeout';
    },
    [fetchLeadGenerationStatus, fetchLeads, queryClient]
  );

  const { mutate: generate, isLoading: isGenerating } = useMutation({
    mutationFn: async () => {
      abortCtrl.current = new AbortController();
      const { signal } = abortCtrl.current;

      const { executionUuid } = await generateLeadsApi({ params: { connectorId }, signal });
      return pollForCompletion(executionUuid, signal);
    },
    onSuccess: (result) => {
      setHasGenerated(true);
      if (result === 'timeout') {
        addWarning(i18n.GENERATE_TIMEOUT);
      } else {
        addSuccess(i18n.GENERATE_SUCCESS);
      }
    },
    onError: (error: Error) => {
      addError(error, { title: i18n.GENERATE_ERROR });
    },
  });

  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: [LEAD_SCHEDULE_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeadGenerationStatus({ signal }),
    enabled: isEnabled,
    onError: (error: Error) => addError(error, { title: i18n.FETCH_STATUS_ERROR }),
  });

  const { mutate: toggleSchedule } = useMutation({
    mutationFn: (enabled: boolean) =>
      enabled ? enableLeadGeneration({ connectorId }) : disableLeadGeneration(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LEAD_SCHEDULE_QUERY_KEY] }),
    onError: (error: Error) => addError(error, { title: i18n.SCHEDULE_UPDATE_ERROR }),
  });

  const isLoading = isLeadsLoading || isStatusLoading;

  return {
    leads: data?.leads?.map(fromApiLead) ?? [],
    totalCount: data?.total ?? 0,
    isLoading,
    isGenerating,
    hasGenerated,
    lastRunTimestamp: statusData?.lastRun ?? null,
    generate,
    refetch,
    isScheduled: statusData?.isEnabled ?? false,
    toggleSchedule,
  };
};
