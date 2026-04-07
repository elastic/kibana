/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/inference-connectors';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID } from '../../common/constants';
import { useKibana } from './use_kibana';

export interface UseGenAIConnectorsResult {
  connectors: AIConnector[];
  hasConnectors: boolean;
  loading: boolean;
}

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const {
    services: { http, settings },
  } = useKibana();

  const { data: connectors = [], isLoading: loading } = useLoadConnectors({
    http: http!,
    featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
    settings: settings!,
  });

  return {
    connectors,
    hasConnectors: connectors.length > 0,
    loading,
  };
}
