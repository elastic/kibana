/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppToasts } from './use_app_toasts';
import { loadAiConnectors } from '../utils/connectors/ai_connectors';
import * as i18n from './translations';
import { useKibana } from '../lib/kibana';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';

const QUERY_KEY = ['ai_connectors'];

export const useAIConnectors = () => {
  const {
    services: { http, settings },
  } = useKibana();

  const { addError } = useAppToasts();

  const defaultAiConnectorId = settings.client.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
  const defaultAiConnectorOnly = settings.client.get<boolean>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    false
  );

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const allAiConnectors = await loadAiConnectors(http)

      const availableConnectors = allAiConnectors.filter((connector) => {
        if (defaultAiConnectorOnly) {
          return connector.id === defaultAiConnectorId;
        }
        return true;
      });

      if (availableConnectors.length === 0) {
        return allAiConnectors;
      }
      return availableConnectors;
    },
    onError: (err) => {
      addError(err, {
        title: i18n.ERROR_FETCH_AI_CONNECTORS,
      });
    },
    refetchOnWindowFocus: false,
  });

  return useMemo(
    () => ({
      aiConnectors: data ?? [],
      isLoading,
      error,
    }),
    [data, isLoading, error]
  );
};

export const useInvalidateGetAIConnectors = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(QUERY_KEY);
  }, [queryClient]);
};
