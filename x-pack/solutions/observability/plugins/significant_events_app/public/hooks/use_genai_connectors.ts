/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

const CONNECTORS_QUERY_KEY = ['significant_events', 'inference_connectors'] as const;

export interface UseGenAIConnectorsResult {
  connectors: InferenceConnector[] | undefined;
  loading: boolean;
  error: Error | undefined;
  reloadConnectors: () => Promise<void>;
}

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const {
    dependencies: {
      start: { inference },
    },
  } = useKibana();

  const {
    data: connectors,
    isLoading,
    error,
    refetch,
  } = useQuery<InferenceConnector[], Error>({
    queryKey: CONNECTORS_QUERY_KEY,
    queryFn: () => inference.getConnectors(),
  });

  const reloadConnectors = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    connectors,
    loading: isLoading,
    error: error ?? undefined,
    reloadConnectors,
  };
}
