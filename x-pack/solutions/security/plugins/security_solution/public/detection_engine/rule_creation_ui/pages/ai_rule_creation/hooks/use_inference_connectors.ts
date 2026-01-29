/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { useQuery } from '@kbn/react-query';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import { useMemo } from 'react';

import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../../common/lib/kibana';
import * as i18n from '../translations';

/**
 * Converts an InferenceConnector to ActionConnector format
 */
function inferenceConnectorToActionConnector(
  inferenceConnector: InferenceConnector
): ActionConnector {
  return {
    id: inferenceConnector.connectorId,
    actionTypeId: inferenceConnector.type,
    name: inferenceConnector.name,
    config: inferenceConnector.config,
    secrets: {},
    isMissingSecrets: false,
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  };
}

export const useInferenceConnectors = () => {
  const { inference } = useKibana().services;
  const { addError } = useAppToasts();

  const { data: inferenceConnectors, isLoading } = useQuery({
    queryKey: ['security-detection-engine-ai-rule-creation-inference-connectors'],
    queryFn: () => inference.getConnectors(),
    retry: 1,
    onError: (error) => {
      addError(error, {
        title: i18n.AI_RULE_CREATION_CONNECTORS_LOAD_ERROR,
      });
    },
  });

  const aiConnectors: ActionConnector[] = useMemo(() => {
    if (!inferenceConnectors) {
      return [];
    }
    return inferenceConnectors.map(inferenceConnectorToActionConnector);
  }, [inferenceConnectors]);

  return {
    aiConnectors,
    isLoading,
  };
};
