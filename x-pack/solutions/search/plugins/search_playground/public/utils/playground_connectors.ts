/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OPENAI_CONNECTOR_ID,
  OpenAiProviderType,
  BEDROCK_CONNECTOR_ID,
  GEMINI_CONNECTOR_ID,
  INFERENCE_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/public/common';
import type { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { isSupportedConnector } from '@kbn/inference-common';
import { isInferenceEndpointExists } from '@kbn/inference-endpoint-ui-common';
import {
  LLMs,
  type ActionConnector,
  type UserConfiguredActionConnector,
  type PlaygroundConnector,
  InferenceActionConnector,
} from '../types';

type OpenAIConnector = UserConfiguredActionConnector<
  { apiProvider: OpenAiProviderType },
  Record<string, unknown>
>;

function isOpenAIConnector(connector: ActionConnector): connector is OpenAIConnector {
  return connector.actionTypeId === OPENAI_CONNECTOR_ID;
}

const connectorTypeToLLM: Array<{
  actionId: string;
  actionProvider?: string;
  match: (connector: ActionConnector) => boolean;
  transform: (connector: ActionConnector) => PlaygroundConnector;
}> = [
  {
    actionId: OPENAI_CONNECTOR_ID,
    actionProvider: OpenAiProviderType.AzureAi,
    match: (connector) =>
      isOpenAIConnector(connector) && connector?.config?.apiProvider === OpenAiProviderType.AzureAi,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIAzureConnectorTitle', {
        defaultMessage: 'OpenAI Azure',
      }),
      type: LLMs.openai_azure,
    }),
  },
  {
    actionId: OPENAI_CONNECTOR_ID,
    match: (connector) =>
      isOpenAIConnector(connector) &&
      (connector?.config?.apiProvider === OpenAiProviderType.OpenAi ||
        Boolean(connector.isPreconfigured)),
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIConnectorTitle', {
        defaultMessage: 'OpenAI',
      }),
      type: LLMs.openai,
    }),
  },
  {
    actionId: OPENAI_CONNECTOR_ID,
    actionProvider: OpenAiProviderType.Other,
    match: (connector) =>
      isOpenAIConnector(connector) && connector?.config?.apiProvider === OpenAiProviderType.Other,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIOtherConnectorTitle', {
        defaultMessage: 'OpenAI Other',
      }),
      type: LLMs.openai_other,
    }),
  },
  {
    actionId: BEDROCK_CONNECTOR_ID,
    match: (connector) => connector.actionTypeId === BEDROCK_CONNECTOR_ID,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.bedrockConnectorTitle', {
        defaultMessage: 'Bedrock',
      }),
      type: LLMs.bedrock,
    }),
  },
  {
    actionId: GEMINI_CONNECTOR_ID,
    match: (connector) => connector.actionTypeId === GEMINI_CONNECTOR_ID,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.geminiConnectorTitle', {
        defaultMessage: 'Gemini',
      }),
      type: LLMs.gemini,
    }),
  },
  {
    actionId: INFERENCE_CONNECTOR_ID,
    match: (connector) =>
      connector.actionTypeId === INFERENCE_CONNECTOR_ID && isSupportedConnector(connector),
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.aiConnectorTitle', {
        defaultMessage: 'AI Connector',
      }),
      type: LLMs.inference,
    }),
  },
];

function isInferenceActionConnector(
  connector: ActionConnector
): connector is InferenceActionConnector {
  return connector.actionTypeId === INFERENCE_CONNECTOR_ID && isSupportedConnector(connector);
}

export async function parsePlaygroundConnectors(
  connectors: ActionConnector[],
  http: HttpSetup
): Promise<PlaygroundConnector[]> {
  const playgroundConnectors: PlaygroundConnector[] = [];
  for (const connector of connectors) {
    const { transform } = connectorTypeToLLM.find(({ match }) => match(connector)) || {};
    if (transform === undefined) continue;
    if (connector.isMissingSecrets) continue;
    if (!isInferenceActionConnector(connector)) {
      playgroundConnectors.push(transform(connector));
    } else {
      const connectorInferenceEndpointExists = await isInferenceEndpointExists(
        http,
        connector.config.inferenceId
      );
      if (connectorInferenceEndpointExists) {
        playgroundConnectors.push(transform(connector));
      }
    }
  }
  return playgroundConnectors;
}
