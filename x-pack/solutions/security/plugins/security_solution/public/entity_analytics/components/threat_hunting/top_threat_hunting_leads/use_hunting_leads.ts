/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { fromApiLead } from './types';
import * as i18n from './translations';

const HUNTING_LEADS_QUERY_KEY = 'hunting-leads';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LEAD_SCHEDULE_QUERY_KEY = 'lead-generation-status';

const FETCH_LEADS_PARAMS = {
  params: {
    page: 1 as const,
    perPage: 10 as const,
    sortField: 'priority' as const,
    sortOrder: 'desc' as const,
    status: 'active' as const,
  },
};

export const useHuntingLeads = () => {
  const {
    fetchLeads,
    generateLeads: generateLeadsApi,
    fetchLeadGenerationStatus,
    enableLeadGeneration,
    disableLeadGeneration,
  } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    return () => {
      abortCtrl.current.abort();
    };
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [HUNTING_LEADS_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeads({ signal, ...FETCH_LEADS_PARAMS }),
  });

  const { mutate: generate, isLoading: isGenerating } = useMutation({
    mutationFn: async () => {
      abortCtrl.current = new AbortController();
      const { signal } = abortCtrl.current;

      await generateLeadsApi({ params: {} });

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (signal.aborted) return;
        await delay(POLL_INTERVAL_MS);
        if (signal.aborted) return;
        const result = await fetchLeads({ ...FETCH_LEADS_PARAMS, signal });
        if (result.leads && result.leads.length > 0) {
          queryClient.setQueryData([HUNTING_LEADS_QUERY_KEY], result);
          return;
        }
      }
      await queryClient.invalidateQueries({ queryKey: [HUNTING_LEADS_QUERY_KEY] });
    },
    onSuccess: () => {
      addSuccess(i18n.GENERATE_SUCCESS);
    },
    onError: (error: Error) => {
      addError(error, { title: i18n.GENERATE_ERROR });
    },
  });

  const { data: statusData } = useQuery({
    queryKey: [LEAD_SCHEDULE_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeadGenerationStatus({ signal }),
  });

  const { mutate: toggleSchedule } = useMutation({
    mutationFn: (enabled: boolean) => (enabled ? enableLeadGeneration() : disableLeadGeneration()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [LEAD_SCHEDULE_QUERY_KEY] }),
    onError: (error: Error) => addError(error, { title: i18n.SCHEDULE_UPDATE_ERROR }),
  });

  return {
    leads: data?.leads?.map(fromApiLead) ?? [],
    totalCount: data?.total ?? 0,
    isLoading,
    isGenerating,
    generate,
    refetch,
    isScheduled: statusData?.isEnabled ?? false,
    toggleSchedule,
  };
};
