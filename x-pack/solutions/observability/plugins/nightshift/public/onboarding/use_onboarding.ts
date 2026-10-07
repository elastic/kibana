/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { GetOnboardingResponse } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';

export const NIGHTSHIFT_ONBOARDING_QUERY_KEY = ['nightshift.onboarding'] as const;

const POLL_INTERVAL_MS = 3_000;

/** The space's onboarding state: its latest onboarding suggestions workflow execution. */
export const useOnboarding = () => {
  const { nightshiftInvestigations } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;

  return useQuery<GetOnboardingResponse>({
    queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY,
    enabled: investigationsClient != null,
    queryFn: async ({ signal }) => {
      if (!investigationsClient) {
        return {};
      }
      return investigationsClient.fetch('GET /internal/nightshift/onboarding', {
        signal: signal ?? null,
      });
    },
    refetchInterval: (data) => (data?.execution?.status === 'running' ? POLL_INTERVAL_MS : false),
  });
};

/** Starts the onboarding suggestions workflow for the given connectors. */
export const useStartOnboardingSuggestions = () => {
  const { nightshiftInvestigations, notifications } = useKibana().services;
  const investigationsClient = nightshiftInvestigations?.investigationsClient;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectorIds: string[]) => {
      if (!investigationsClient) {
        throw new Error('Nightshift investigations plugin is unavailable');
      }
      return investigationsClient.fetch('POST /internal/nightshift/onboarding/suggestions', {
        params: { body: { connector_ids: connectorIds } },
        signal: null,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NIGHTSHIFT_ONBOARDING_QUERY_KEY }),
    onError: (error: Error) => {
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.nightshift.onboarding.connectErrorToastTitle', {
          defaultMessage: 'Could not connect the deployment',
        }),
      });
    },
  });
};

export interface ElasticsearchConnector {
  id: string;
  name: string;
  url?: string;
  kibanaUrl?: string;
}

/** External Elasticsearch connectors of the current space. */
export const useElasticsearchConnectors = () => {
  const { http } = useKibana().services;
  return useQuery<ElasticsearchConnector[]>({
    queryKey: ['nightshift.onboarding.connectors'],
    queryFn: async ({ signal }) => {
      const connectors = await http.get<
        Array<{
          id: string;
          name: string;
          connector_type_id: string;
          config?: { url?: string; kibanaUrl?: string };
        }>
      >('/api/actions/connectors', { signal });
      return connectors
        .filter(({ connector_type_id: typeId }) => typeId === '.elasticsearch')
        .map(({ id, name, config }) => ({
          id,
          name,
          url: config?.url,
          kibanaUrl: config?.kibanaUrl,
        }));
    },
  });
};
