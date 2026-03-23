/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { useMemo } from 'react';
import { useAIConnectors } from './use_ai_connectors';
import { useKibana } from '../lib/kibana';

export const useDefaultAIConnectorId = () => {
  const { settings } = useKibana().services;

  const { aiConnectors: connectors, isLoading: isLoadingConnectors } = useAIConnectors();
  const defaultConnectorId = getDefaultConnector(connectors, settings)?.id;

  return useMemo(
    () => ({
      defaultConnectorId,
      isLoading: isLoadingConnectors,
    }),
    [defaultConnectorId, isLoadingConnectors]
  );
};
