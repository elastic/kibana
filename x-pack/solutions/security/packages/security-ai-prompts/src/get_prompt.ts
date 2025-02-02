/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { elasticModelDictionary } from '@kbn/inference-common';
import { PromptArray, Prompt, GetPromptArgs, GetPromptsByGroupIdArgs } from './types';
import { getProviderFromActionTypeId } from './utils';
import { promptSavedObjectType } from './saved_object_mappings';

/**
 * Get prompts by feature (promptGroupId)
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client
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
  actionsClient,
  connector,
  connectorId,
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
    actionsClient,
    providedConnector: connector,
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
  actionsClient,
  connector,
  connectorId,
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
    actionsClient,
    providedConnector: connector,
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
  actionsClient,
  providedConnector,
}: {
  providedProvider?: string;
  providedModel?: string;
  connectorId: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  providedConnector?: Connector;
}): Promise<{ provider?: string; model?: string }> => {
  let model = providedModel;
  let provider = providedProvider;
  if (!provider || !model || provider === 'inference') {
    const connector = providedConnector ?? (await actionsClient.get({ id: connectorId }));

    if (provider === 'inference' && connector.config) {
      provider = connector.config.provider || provider;
      model = connector.config.providerConfig?.model_id || model;

      if (provider === 'elastic' && model) {
        provider = elasticModelDictionary[model]?.provider || 'inference';
        model = elasticModelDictionary[model]?.model;
      }
    } else if (connector.config) {
      provider = provider || getProviderFromActionTypeId(connector.actionTypeId);
      model = model || connector.config.defaultModel;
    }
  }

  return { provider: provider === 'inference' ? 'bedrock' : provider, model };
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
