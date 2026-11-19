/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { ALERT_AI_SUMMARY_INFERENCE_FEATURE_ID } from '../../../common/constants';
import { useKibana } from '../lib/kibana';

// Value of the default connector setting when no default is configured.
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Resolves the default AI connector id for the alert AI summary from the server-side model list,
 * which includes inference endpoints (for example an External Inference global model) that are
 * not stack connectors. The alert AI summary has its own inference feature, so a model assigned
 * only to the AI Assistant does not change which model the summary uses.
 *
 * The default setting can hold a stack connector alias of an inference endpoint (for example a
 * preconfigured `.inference` connector id), while the list holds the endpoint id. When no entry
 * matches the setting, the alias is resolved on the server so the configured default still wins.
 */
export const useDefaultAIConnectorId = () => {
  const { http, notifications, settings } = useKibana().services;

  const { data: connectors, isLoading: isLoadingConnectors } = useLoadConnectors({
    http,
    toasts: notifications.toasts,
    featureId: ALERT_AI_SUMMARY_INFERENCE_FEATURE_ID,
  });

  const defaultSetting = settings.client.get<string | undefined>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
    undefined
  );
  const needsAliasLookup =
    !!connectors &&
    !!defaultSetting &&
    defaultSetting !== NO_DEFAULT_CONNECTOR &&
    !connectors.some(({ id }) => id === defaultSetting);

  const { data: aliasTargetId, isFetching: isResolvingAlias } = useQuery({
    queryKey: ['security-solution', 'alert-ai-summary-default-connector', defaultSetting],
    queryFn: async () => {
      const { connector } = await http.get<{ connector: { connectorId: string } }>(
        `/internal/inference/connectors/${encodeURIComponent(defaultSetting ?? '')}`
      );
      return connector.connectorId;
    },
    enabled: needsAliasLookup,
    retry: false,
  });

  const defaultConnectorId =
    connectors?.find(({ id }) => id === aliasTargetId)?.id ??
    getDefaultConnector(connectors, settings)?.id;
  const isLoading = isLoadingConnectors || (needsAliasLookup && isResolvingAlias);

  return useMemo(
    () => ({
      defaultConnectorId,
      isLoading,
    }),
    [defaultConnectorId, isLoading]
  );
};
