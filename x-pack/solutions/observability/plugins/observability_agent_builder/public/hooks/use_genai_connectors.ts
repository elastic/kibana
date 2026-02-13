/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { InferenceConnector } from '@kbn/inference-common';
import { getDefaultConnector } from '@kbn/inference-plugin/public';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';

export interface UseGenAIConnectorsResult {
  connectors: InferenceConnector[];
  hasConnectors: boolean;
  loading: boolean;
  selectedConnector: InferenceConnector | undefined;
}

/**
 * Hook to fetch available GenAI connectors and determine the selected connector.
 */
export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const {
    services: { inference, uiSettings },
  } = useKibana();

  const { value: connectors = [], loading } = useAsync(async () => {
    if (!inference) {
      return [];
    }
    return inference.getConnectors();
  }, [inference]);

  const defaultConnectorId = uiSettings.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);

  const selectedConnector = useMemo(() => {
    if (!connectors.length) {
      return undefined;
    }

    if (defaultConnectorId) {
      const defaultConnector = connectors.find((c) => c.connectorId === defaultConnectorId);
      if (defaultConnector) {
        return defaultConnector;
      }
    }
    return getDefaultConnector({ connectors });
  }, [connectors, defaultConnectorId]);

  return {
    connectors,
    hasConnectors: connectors.length > 0,
    loading,
    selectedConnector,
  };
}
