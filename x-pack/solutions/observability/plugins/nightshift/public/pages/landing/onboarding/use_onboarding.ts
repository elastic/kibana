/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { GetOnboardingResponse } from '@kbn/nightshift-investigations-plugin/common';
import { NIGHTSHIFT_ONBOARDING_QUERY_KEY } from '../../../data/query_keys';
import { useKibana } from '../../../hooks/use_kibana';

const POLL_INTERVAL_MS = 3_000;
const START_SUGGESTIONS_MUTATION_KEY = ['nightshift.startOnboardingSuggestions'] as const;

/** The space's onboarding state: its latest onboarding suggestions workflow execution. */
export const useOnboarding = () => {
  const { nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useQuery<GetOnboardingResponse>({
    queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        return { agent_installed: false };
      }
      return investigationsClient.fetch('GET /internal/nightshift/onboarding', {
        signal: signal ?? null,
      });
    },
    refetchInterval: (data) => (data?.execution?.status === 'running' ? POLL_INTERVAL_MS : false),
  });
};

export const useStartOnboardingSuggestions = () => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  type RefetchOnboarding = ReturnType<typeof useOnboarding>['refetch'];

  const { isLoading, mutate } = useMutation({
    mutationKey: START_SUGGESTIONS_MUTATION_KEY,
    mutationFn: async (refetch?: RefetchOnboarding) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      if (refetch) {
        const { data } = await refetch({ throwOnError: true });
        if (!data?.execution?.needs_refresh) return;
      }
      return investigationsClient.fetch('POST /internal/nightshift/onboarding/suggestions', {
        signal: null,
      });
    },
    onSuccess: (execution) => {
      if (execution)
        return queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY });
    },
    onError: (error: Error) => {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.nightshift.onboarding.startErrorToastTitle', {
          defaultMessage: 'Could not start looking for first investigations',
        }),
      });
    },
  });

  return {
    isLoading,
    start: (refetch?: RefetchOnboarding, onReuseSuggestions?: () => void) => {
      if (queryClient.isMutating({ mutationKey: START_SUGGESTIONS_MUTATION_KEY })) return;
      mutate(refetch, {
        onSuccess: (execution) => {
          if (!execution) onReuseSuggestions?.();
        },
      });
    },
  };
};
