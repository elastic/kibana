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

export const useHuntingLeads = () => {
  const { fetchLeads, generateLeads: generateLeadsApi } = useEntityAnalyticsRoutes();
  const queryClient = useQueryClient();
  const { addSuccess, addError } = useAppToasts();

  const { data, isLoading, refetch } = useQuery({
    queryKey: [HUNTING_LEADS_QUERY_KEY],
    queryFn: ({ signal }) =>
      fetchLeads({
        signal,
        params: {
          page: 1,
          perPage: 10,
          sortField: 'priority',
          sortOrder: 'desc',
          status: 'active',
        },
      }),
  });

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: () => generateLeadsApi({ params: {} }),
    onSuccess: () => {
      addSuccess(i18n.GENERATE_SUCCESS);
      queryClient.invalidateQueries({ queryKey: [HUNTING_LEADS_QUERY_KEY] });
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
