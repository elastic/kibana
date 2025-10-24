/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { useMemo } from 'react';
import {
  AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED,
  AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED_VALUE,
  DEFAULT_AI_CONNECTOR,
} from '../../../common/constants';
import { useAIConnectors } from './use_ai_connectors';
import { useKibana } from '../lib/kibana';

export const useDefaultAIConnectorId = () => {
  const { settings, uiSettings, featureFlags } = useKibana().services;

  const { aiConnectors: connectors, isLoading: isLoadingConnectors } = useAIConnectors();
  const legacyDefaultConnectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);
  const useNewDefaultConnector = featureFlags.getBooleanValue(
    AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED,
    AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED_VALUE
  );
  const newDefaultConnectorId = getDefaultConnector(connectors, settings)?.id;

  return useMemo(
    () => ({
      defaultConnectorId: useNewDefaultConnector ? newDefaultConnectorId : legacyDefaultConnectorId,
      isLoading: isLoadingConnectors,
    }),
    [useNewDefaultConnector, newDefaultConnectorId, legacyDefaultConnectorId, isLoadingConnectors]
  );
};
