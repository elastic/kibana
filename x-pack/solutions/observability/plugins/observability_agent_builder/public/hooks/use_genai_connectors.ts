/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { useLoadConnectors, type AIConnector } from '@kbn/inference-connectors';
import { OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID } from '../../common/constants';
import { useKibana } from './use_kibana';

export interface UseGenAIConnectorsResult {
  connectors: InferenceConnector[];
  hasConnectors: boolean;
  loading: boolean;
}

const toInferenceConnector = (connector: AIConnector): InferenceConnector => ({
  connectorId: connector.id,
  name: connector.name,
  type: connector.actionTypeId as InferenceConnectorType,
  config: 'config' in connector ? connector.config ?? {} : {},
  capabilities: {},
  isInferenceEndpoint: connector.actionTypeId === InferenceConnectorType.Inference,
  isPreconfigured: connector.isPreconfigured,
  isEis: connector.isEis,
  isDeprecated: connector.isDeprecated,
  isConnectorTypeDeprecated: connector.isConnectorTypeDeprecated,
  isMissingSecrets: connector.isMissingSecrets,
});

export function useGenAIConnectors(): UseGenAIConnectorsResult {
  const {
    services: { http, settings, notifications },
  } = useKibana();

  const { data: aiConnectors, isLoading: loading } = useLoadConnectors({
    http: http!,
    toasts: notifications?.toasts,
    featureId: OBSERVABILITY_AI_INSIGHTS_SUBFEATURE_ID,
    settings: settings!,
  });

  const connectors = useMemo(() => aiConnectors?.map(toInferenceConnector) ?? [], [aiConnectors]);

  return {
    connectors,
    hasConnectors: connectors.length > 0,
    loading,
  };
}
