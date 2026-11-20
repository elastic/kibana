/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * The flyout has no model picker, so it uses the first usable entry of the list, which the server
 * orders: the admin's saved models in their order, otherwise the global default first (also when it
 * is a stack connector alias of an endpoint), otherwise the platform default chat endpoint.
 */
export const useDefaultAIConnectorId = () => {
  const { http, notifications } = useKibana().services;

  const { data: connectors, isLoading } = useLoadConnectors({
    http,
    toasts: notifications.toasts,
    featureId: ALERT_AI_SUMMARY_INFERENCE_FEATURE_ID,
  });
  const defaultConnectorId = connectors?.find((connector) => !connector.isMissingSecrets)?.id;

  return useMemo(
    () => ({
      defaultConnectorId,
      isLoading,
    }),
    [defaultConnectorId, isLoading]
  );
};
