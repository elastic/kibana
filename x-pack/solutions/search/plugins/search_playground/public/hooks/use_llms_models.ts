/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { HttpSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';

import type { PlaygroundConnector, InferenceActionConnector, ActionConnector } from '../types';
import { SearchPlaygroundQueryKeys } from '../../common';
import { LLMs } from '../../common/types';
import { LLMModel } from '../types';
import { MODELS } from '../../common/models';
import { useKibana } from './use_kibana';
import { LoadConnectorsQuery } from './use_load_connectors';

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

export const LLMsQuery =
  (http: HttpSetup, client: QueryClient) => async (): Promise<LLMModel[]> => {
    const connectors = await client.fetchQuery<PlaygroundConnector[]>({
      queryKey: [SearchPlaygroundQueryKeys.LoadConnectors],
      queryFn: LoadConnectorsQuery(http),
      retry: false,
    });

    const mapConnectorTypeToCount = connectors.reduce<Partial<Record<LLMs, number>>>(
      (result, connector) => {
        result[connector.type] = (result[connector.type] || 0) + 1;
        return result;
      },
      {}
    );

    const models = connectors.reduce<LLMModel[]>((result, connector) => {
      const connectorType = connector.type as LLMs;
      const llmParams = mapLlmToModels[connectorType];

      if (!llmParams) {
        return result;
      }

      const showConnectorName = Number(mapConnectorTypeToCount?.[connectorType]) > 1;

      llmParams
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
          icon: typeof llmParams.icon === 'function' ? llmParams.icon(connector) : llmParams.icon,
          disabled: !connector,
          connectorId: connector.id,
          promptTokenLimit,
        }))
        .forEach((model) => result.push(model));

      return result;
    }, []);

    return models;
  };

export const useLLMsModels = (): LLMModel[] => {
  const client = useQueryClient();
  const {
    services: { http },
  } = useKibana();

  const { data } = useQuery([SearchPlaygroundQueryKeys.LLMsQuery], LLMsQuery(http, client), {
    keepPreviousData: true,
    retry: false,
  });

  return data || [];
};
