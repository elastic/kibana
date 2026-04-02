/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { fromApiLead } from './types';
import * as i18n from './translations';

const HUNTING_LEADS_QUERY_KEY = 'hunting-leads';
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 120_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useHuntingLeads = () => {
  const { fetchLeads, generateLeads: generateLeadsApi } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();

  const fetchLeadsParams = {
    params: {
      page: 1 as const,
      perPage: 10 as const,
      sortField: 'priority' as const,
      sortOrder: 'desc' as const,
      status: 'active' as const,
    },
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: [HUNTING_LEADS_QUERY_KEY],
    queryFn: ({ signal }) => fetchLeads({ signal, ...fetchLeadsParams }),
  });

  const { mutate: generate, isLoading: isGenerating } = useMutation({
    mutationFn: async () => {
      await generateLeadsApi({ params: {} });

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await delay(POLL_INTERVAL_MS);
        const result = await fetchLeads(fetchLeadsParams);
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

  return {
    leads: data?.leads?.map(fromApiLead) ?? [],
    totalCount: data?.total ?? 0,
    isLoading,
    isGenerating,
    generate,
    refetch,
  };
};
