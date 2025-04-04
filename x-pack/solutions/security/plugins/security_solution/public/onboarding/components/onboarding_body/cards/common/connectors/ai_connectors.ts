/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpSetup } from '@kbn/core-http-browser';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';
import {
  loadAllActions,
  type ActionConnector,
} from '@kbn/triggers-actions-ui-plugin/public/common/constants';

const ExternalAIActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];
const InferenceActionTypeId = '.inference';

type PreconfiguredInferenceConnector = ActionConnector & {
  actionTypeId: typeof InferenceActionTypeId;
  isPreconfigured: true;
  config?: {
    inferenceId: string;
  };
};

const isExternalAIConnector = (connector: ActionConnector): boolean =>
  ExternalAIActionTypeIds.includes(connector.actionTypeId);

const isPreConfiguredInferenceConnector = (
  connector: ActionConnector
): connector is PreconfiguredInferenceConnector =>
  connector.actionTypeId === InferenceActionTypeId && connector.isPreconfigured;

const isValidAiConnector = async (
  connector: ActionConnector,
  deps: { http: HttpSetup }
): Promise<boolean> => {
  if (connector.isMissingSecrets) {
    return false;
  }

  if (isExternalAIConnector(connector)) {
    return true;
  }

  if (isPreConfiguredInferenceConnector(connector)) {
    const inferenceId = connector.config?.inferenceId;
    if (inferenceId) {
      const exists = await isInferenceEndpointExists(deps.http, inferenceId);
      if (exists) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Loads all AI connectors that are valid, meaning that they don't miss secrets.
 * And in the case of the inference connector, that the inference endpoint exists.
 * @param http - The HTTP client to use for making requests.
 * @returns A promise that resolves to an array of valid AI connectors.
 */
export const loadAiConnectors = async (http: HttpSetup) => {
  const allConnectors = await loadAllActions({ http });

  const aiConnectors: ActionConnector[] = [];
  for (const connector of allConnectors) {
    const isValid = await isValidAiConnector(connector, { http });
    if (isValid) {
      aiConnectors.push(connector);
    }
  }
  return aiConnectors;
};
