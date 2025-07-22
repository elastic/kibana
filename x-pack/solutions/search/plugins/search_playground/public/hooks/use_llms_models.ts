/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import type { PlaygroundConnector, InferenceActionConnector, ActionConnector } from '../types';
import { LLMs } from '../../common/types';
import { LLMModel } from '../types';
import { useLoadConnectors } from './use_load_connectors';
import { MODELS } from '../../common/models';

const isInferenceActionConnector = (
  connector: ActionConnector
): connector is InferenceActionConnector => {
  return 'config' in connector && 'provider' in connector.config;
};

const mapLlmToModels: Record<
  LLMs,
  {
    icon: string | ((connector: PlaygroundConnector) => string);
    getModels: (
      connectorName: string,
      includeName: boolean,
      modelId?: string
    ) => Array<{ label: string; value?: string; promptTokenLimit?: number }>;
  }
> = {
  [LLMs.openai]: {
    icon: SERVICE_PROVIDERS.openai.icon,
    getModels: (connectorName, includeName) =>
      MODELS.filter(({ provider }) => provider === LLMs.openai).map((model) => ({
        label: `${model.name} ${includeName ? `(${connectorName})` : ''}`,
        value: model.model,
        promptTokenLimit: model.promptTokenLimit,
      })),
  },
  [LLMs.openai_azure]: {
    icon: SERVICE_PROVIDERS.openai.icon,
    getModels: (connectorName) => [
      {
        label: i18n.translate('xpack.searchPlayground.openAIAzureModel', {
          defaultMessage: '{name} (Azure OpenAI)',
          values: { name: connectorName },
        }),
      },
    ],
  },
  [LLMs.openai_other]: {
    icon: SERVICE_PROVIDERS.openai.icon,
    getModels: (connectorName) => [
      {
        label: i18n.translate('xpack.searchPlayground.otherOpenAIModel', {
          defaultMessage: '{name} (OpenAI Compatible Service)',
          values: { name: connectorName },
        }),
      },
    ],
  },
  [LLMs.bedrock]: {
    icon: SERVICE_PROVIDERS.amazonbedrock.icon,
    getModels: () =>
      MODELS.filter(({ provider }) => provider === LLMs.bedrock).map((model) => ({
        label: model.name,
        value: model.model,
        promptTokenLimit: model.promptTokenLimit,
      })),
  },
  [LLMs.gemini]: {
    icon: SERVICE_PROVIDERS.googlevertexai.icon,
    getModels: () =>
      MODELS.filter(({ provider }) => provider === LLMs.gemini).map((model) => ({
        label: model.name,
        value: model.model,
        promptTokenLimit: model.promptTokenLimit,
      })),
  },
  [LLMs.inference]: {
    icon: (connector) => {
      return isInferenceActionConnector(connector)
        ? SERVICE_PROVIDERS[connector.config.provider].icon
        : '';
    },
    getModels: (connectorName, _, modelId) => [
      {
        label: connectorName,
        value: modelId,
        promptTokenLimit: MODELS.find((m) => m.model === modelId)?.promptTokenLimit,
      },
    ],
  },
};

export const useLLMsModels = (): LLMModel[] => {
  const { data: connectors } = useLoadConnectors();

  const mapConnectorTypeToCount = useMemo(
    () =>
      connectors?.reduce<Partial<Record<LLMs, number>>>(
        (result, connector) => ({
          ...result,
          [connector.type]: (result[connector.type as LLMs] || 0) + 1,
        }),
        {}
      ),
    [connectors]
  );

  return useMemo(
    () =>
      connectors?.reduce<LLMModel[]>((result, connector) => {
        const connectorType = connector.type as LLMs;
        const llmParams = mapLlmToModels[connectorType];

        if (!llmParams) {
          return result;
        }

        const showConnectorName = Number(mapConnectorTypeToCount?.[connectorType]) > 1;

        return [
          ...result,
          ...llmParams
            .getModels(
              connector.name,
              false,
              isInferenceActionConnector(connector)
                ? connector.config?.providerConfig?.model_id
                : undefined
            )
            .map(({ label, value, promptTokenLimit }) => ({
              id: connector?.id + label,
              name: label,
              value,
              connectorType: connector.type,
              connectorName: connector.name,
              showConnectorName,
              icon:
                typeof llmParams.icon === 'function' ? llmParams.icon(connector) : llmParams.icon,
              disabled: !connector,
              connectorId: connector.id,
              promptTokenLimit,
            })),
        ];
      }, []) || [],
    [connectors, mapConnectorTypeToCount]
  );
};
