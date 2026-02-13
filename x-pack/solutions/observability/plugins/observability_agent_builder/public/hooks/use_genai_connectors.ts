/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';
import type { InferenceConnector } from '@kbn/inference-common';
import { useKibana } from './use_kibana';

export interface UseGenAIConnectorsResult {
  connectors: InferenceConnector[];
  hasConnectors: boolean;
  loading: boolean;
}

/**
 * Hook to fetch available GenAI connectors.
 */
export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const {
    services: { inference },
  } = useKibana();

  const { value: connectors = [], loading } = useAsync(async () => {
    if (!inference) {
      return [];
    }
    return inference.getConnectors();
  }, [inference]);

  return {
    connectors,
    hasConnectors: connectors.length > 0,
    loading,
  };
}
