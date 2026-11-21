/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import { useLoadConnectors } from '@kbn/inference-connectors';
import { useMemo } from 'react';
import { ALERT_AI_SUMMARY_INFERENCE_FEATURE_ID } from '../../../common/constants';
import { useKibana } from '../lib/kibana';

/**
 * Resolves the AI connector id for the alert AI summary from the server-side model list, which
 * includes inference endpoints (for example an External Inference global model) that are not stack
 * connectors. The alert AI summary has its own inference feature, so a model assigned only to the
 * AI Assistant does not change which model the summary uses.
 *
 * The flyout has no model picker. When an admin saved models for the feature, the first usable one
 * is used, in their order. Otherwise the entry the server flagged as the default is used (also when
 * the setting is a stack connector alias of an endpoint), and when nothing is flagged the list is
 * the unselected catalog, so the usual fallback priority applies (Elastic-managed, then OpenAI).
 */
export const useDefaultAIConnectorId = () => {
  const { http, notifications, settings } = useKibana().services;

  const {
    data: connectors,
    isLoading,
    soEntryFound,
  } = useLoadConnectors({
    http,
    toasts: notifications.toasts,
    featureId: ALERT_AI_SUMMARY_INFERENCE_FEATURE_ID,
  });
  const defaultConnectorId = soEntryFound
    ? connectors?.find((connector) => !connector.isMissingSecrets)?.id
    : getDefaultConnector(connectors, settings)?.id;

  return useMemo(
    () => ({
      defaultConnectorId,
      isLoading,
    }),
    [defaultConnectorId, isLoading]
  );
};
