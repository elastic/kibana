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
  RunQuotaSettingsUpdate,
  RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';
import { useKibana } from '../../hooks/use_kibana';
import { RUN_QUOTAS_QUERY_KEY } from '../query_keys';

const RUN_QUOTAS_POLL_INTERVAL_MS = 5_000;

export const useRunQuotas = ({
  enabled = true,
  poll = false,
}: { enabled?: boolean; poll?: boolean } = {}) => {
  const { significantEventsRepositoryClient } = useKibana().services.significantEvents;

  return useQuery<RunQuotasResponse, Error>({
    queryKey: RUN_QUOTAS_QUERY_KEY,
    enabled,
    refetchInterval: poll ? RUN_QUOTAS_POLL_INTERVAL_MS : false,
    queryFn: ({ signal }: QueryFunctionContext) =>
      significantEventsRepositoryClient.fetch('GET /internal/significant_events/run_quotas', {
        signal: signal ?? null,
      }),
    refetchOnWindowFocus: true,
  });
};

export const useUpdateRunQuotas = () => {
  const {
    notifications: { toasts },
    significantEvents: { significantEventsRepositoryClient },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const mutation = useMutation<RunQuotasResponse, Error, RunQuotaSettingsUpdate>({
    mutationFn: (body) =>
      significantEventsRepositoryClient.fetch('PUT /internal/significant_events/run_quotas', {
        signal: null,
        params: { body },
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(RUN_QUOTAS_QUERY_KEY, response);
      toasts.addSuccess({
        title: i18n.translate('xpack.nightshift.settings.runQuotas.saveSuccessToastTitle', {
          defaultMessage: 'Updated daily run limits',
        }),
      });
      return queryClient.invalidateQueries({ queryKey: RUN_QUOTAS_QUERY_KEY });
    },
  });

  return {
    save: (update: RunQuotaSettingsUpdate) => mutation.mutateAsync(update),
    isSaving: mutation.isLoading,
  };
};
