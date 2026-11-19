/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useMemo } from 'react';
import { useKibana } from '../lib/kibana';

/**
 * Resolves the default AI connector id from the same server-side list the AI Assistant uses.
 * That list includes inference endpoints (for example an External Inference global model),
 * which are not stack connectors and would otherwise never match the configured default.
 */
export const useDefaultAIConnectorId = () => {
  const { http, settings } = useKibana().services;

  const { data: connectors, isLoading } = useLoadConnectors({
    http,
    featureId: 'elastic_assistant',
  });
  const defaultConnectorId = getDefaultConnector(connectors, settings)?.id;

  return useMemo(
    () => ({
      defaultConnectorId,
      isLoading,
    }),
    [defaultConnectorId, isLoading]
  );
};
