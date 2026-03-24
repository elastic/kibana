/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticModelDictionary,
  InferenceConnectorType,
  InferenceEndpointProvider,
} from '@kbn/inference-common';
import type { InferenceConnector } from '@kbn/inference-common';
import type { PromptArray, Prompt, GetPromptArgs, GetPromptsByGroupIdArgs } from './types';
import { getProviderFromActionTypeId } from './utils';
import { promptSavedObjectType } from './saved_object_mappings';

/**
 * Get prompts by feature (promptGroupId)
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client (look up connector if connector is not provided)
 * @param connector - connector, provide if available. No need to provide model and provider in this case
 * @param connectorId - connector id
 * @param localPrompts - local prompts object
 * @param model - model. No need to provide if connector provided
 * @param promptGroupId - feature id, should be common across promptIds
 * @param promptIds - prompt ids with shared promptGroupId
 * @param provider  - provider. No need to provide if connector provided
 * @param savedObjectsClient - saved objects client
 */
export const getPromptsByGroupId = async ({
  connectorId,
  getInferenceConnectorById,
  localPrompts,
  model: providedModel,
  promptGroupId,
  promptIds,
  provider: providedProvider,
  savedObjectsClient,
}: GetPromptsByGroupIdArgs): Promise<PromptArray> => {
  const { provider, model } = await resolveProviderAndModel({
    providedProvider,
    providedModel,
    connectorId,
    getInferenceConnectorById,
  });

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    searchFields: ['promptGroupId'],
    search: promptGroupId,
  });
  const promptsOnly = prompts?.saved_objects.map((p) => p.attributes) ?? [];

  return promptIds.map((promptId) => {
    const prompt = findPromptEntry({
      prompts: promptsOnly.filter((p) => p.promptId === promptId) ?? [],
      promptId,
      promptGroupId,
      provider,
      model,
      localPrompts,
    });
    if (!prompt) {
      throw new Error(
        `Prompt not found for promptId: ${promptId} and promptGroupId: ${promptGroupId}`
      );
    }

    return {
      promptId,
      prompt,
    };
  });
};

/**
 * Get prompt by promptId
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client
 * @param connector - connector, provide if available. No need to provide model and provider in this case
 * @param connectorId - connector id
 * @param localPrompts - local prompts object
 * @param model - model. No need to provide if connector provided
 * @param promptId - prompt id
 * @param promptGroupId - feature id, should be common across promptIds
 * @param provider  - provider. No need to provide if connector provided
 * @param savedObjectsClient - saved objects client
 */
export const getPrompt = async ({
  connectorId,
  getInferenceConnectorById,
  localPrompts,
  model: providedModel,
  promptGroupId,
  promptId,
  provider: providedProvider,
  savedObjectsClient,
}: GetPromptArgs): Promise<string> => {
  const { provider, model } = await resolveProviderAndModel({
    providedProvider,
    providedModel,
    connectorId,
    getInferenceConnectorById,
  });

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    filter: `${promptSavedObjectType}.attributes.promptId: "${promptId}" AND ${promptSavedObjectType}.attributes.promptGroupId: "${promptGroupId}"`,
    fields: ['provider', 'model', 'prompt'],
  });

  const prompt = findPromptEntry({
    prompts: prompts?.saved_objects.map((p) => p.attributes) ?? [],
    promptId,
    promptGroupId,
    provider,
    model,
    localPrompts,
  });
  if (!prompt) {
    throw new Error(
      `Prompt not found for promptId: ${promptId} and promptGroupId: ${promptGroupId}`
    );
  }

  return prompt;
};

export const resolveProviderAndModel = async ({
  providedProvider,
  providedModel,
  connectorId,
  getInferenceConnectorById,
}: {
  providedProvider?: string;
  providedModel?: string;
  connectorId?: string;
  getInferenceConnectorById?: (id: string) => Promise<InferenceConnector>;
}): Promise<{ provider?: string; model?: string }> => {
  if (providedProvider && providedModel && providedProvider !== 'inference') {
    return { provider: providedProvider, model: providedModel };
  }

  if (connectorId != null && getInferenceConnectorById) {
    try {
      return resolveFromInferenceConnector(await getInferenceConnectorById(connectorId));
    } catch {
      return { provider: providedProvider, model: providedModel };
    }
  }

  return { provider: providedProvider, model: providedModel };
};

// Maps ES inference endpoint service names to the provider names used in prompt lookup
const inferenceServiceToProvider: Partial<Record<string, string>> = {
  [InferenceEndpointProvider.AmazonBedrock]: 'bedrock',
  [InferenceEndpointProvider.GoogleVertexAI]: 'gemini',
  [InferenceEndpointProvider.OpenAI]: 'openai',
  [InferenceEndpointProvider.AzureOpenAI]: 'openai',
  [InferenceEndpointProvider.Elastic]: 'elastic',
};

const resolveFromInferenceConnector = ({
  type,
  config,
}: InferenceConnector): { provider?: string; model?: string } => {
  if (type === InferenceConnectorType.Inference) {
    // .inference connectors: Kibana stack connectors use `provider`, native endpoints use `service`
    const rawProvider: string | undefined =
      config.provider || (config.service ? inferenceServiceToProvider[config.service] : undefined);
    const rawModel: string | undefined = config.providerConfig?.model_id;
    if (rawProvider === 'elastic' && rawModel) {
      return {
        provider: elasticModelDictionary[rawModel]?.provider || 'inference',
        model: elasticModelDictionary[rawModel]?.model,
      };
    }
    return { provider: rawProvider, model: rawModel };
  }
  return {
    provider: getProviderFromActionTypeId(type),
    model: config.defaultModel,
  };
};

const findPrompt = ({
  prompts,
  conditions,
}: {
  prompts: Array<{ provider?: string; model?: string; prompt: { default: string } }>;
  conditions: Array<(prompt: { provider?: string; model?: string }) => boolean>;
}): string | undefined => {
  for (const condition of conditions) {
    const match = prompts.find(condition);
    if (match) return match.prompt.default;
  }
  return undefined;
};

const findPromptEntry = ({
  prompts,
  promptId,
  promptGroupId,
  provider,
  model,
  localPrompts,
}: {
  localPrompts: Prompt[];
  prompts: Prompt[];
  promptId: string;
  promptGroupId: string;
  provider?: string;
  model?: string;
}): string | undefined => {
  const conditions = [
    (prompt: { provider?: string; model?: string }) =>
      prompt.provider === provider && prompt.model === model,
    (prompt: { provider?: string; model?: string }) =>
      prompt.provider === provider && !prompt.model,
    (prompt: { provider?: string; model?: string }) => !prompt.provider && !prompt.model,
  ];

  return (
    findPrompt({ prompts, conditions }) ??
    findPrompt({
      prompts: localPrompts.filter(
        (p) => p.promptId === promptId && p.promptGroupId === promptGroupId
      ),
      conditions,
    })
  );
};
