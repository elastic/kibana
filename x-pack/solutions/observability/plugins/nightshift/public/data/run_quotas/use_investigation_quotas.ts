/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { QueryFunctionContext } from '@kbn/react-query';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  InvestigationQuotasResponse,
  InvestigationQuotasUpdate,
} from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { INVESTIGATION_QUOTAS_QUERY_KEY } from '../query_keys';

const INVESTIGATION_QUOTAS_POLL_INTERVAL_MS = 5_000;

const UNAVAILABLE_MESSAGE = 'Nightshift investigations plugin is unavailable';

/** The daily limits on new investigations, today's counts and whether the caller may change them. */
export const useInvestigationQuotas = ({
  enabled = true,
  poll = false,
}: { enabled?: boolean; poll?: boolean } = {}) => {
  const investigationsClient = useKibana().services.nightshiftInvestigations?.investigationsClient;

  return useQuery<InvestigationQuotasResponse, Error>({
    queryKey: INVESTIGATION_QUOTAS_QUERY_KEY,
    enabled: enabled && investigationsClient != null,
    refetchInterval: poll ? INVESTIGATION_QUOTAS_POLL_INTERVAL_MS : false,
    queryFn: ({ signal }: QueryFunctionContext) => {
      if (!investigationsClient) {
        throw new Error(UNAVAILABLE_MESSAGE);
      }
      return investigationsClient.fetch('GET /internal/nightshift/investigation_quotas', {
        signal: signal ?? null,
      });
    },
    refetchOnWindowFocus: true,
  });
};

export const useUpdateInvestigationQuotas = () => {
  const { notifications, nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();
  const mutation = useMutation<InvestigationQuotasResponse, Error, InvestigationQuotasUpdate>({
    mutationFn: (body) => {
      if (!investigationsClient) {
        throw new Error(UNAVAILABLE_MESSAGE);
      }
      return investigationsClient.fetch('PUT /internal/nightshift/investigation_quotas', {
        signal: null,
        params: { body },
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(INVESTIGATION_QUOTAS_QUERY_KEY, response);
      notifications.toasts.addSuccess({
        title: i18n.translate(
          'xpack.nightshift.settings.investigationQuotas.saveSuccessToastTitle',
          {
            defaultMessage: 'Updated daily investigation limits',
          }
        ),
      });
      return queryClient.invalidateQueries({ queryKey: INVESTIGATION_QUOTAS_QUERY_KEY });
    },
  });

  return {
    save: (update: InvestigationQuotasUpdate) => mutation.mutateAsync(update),
    isSaving: mutation.isLoading,
  };
};
