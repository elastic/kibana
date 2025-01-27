/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { elasticModelDictionary } from '@kbn/inference-common';
import { Prompt } from './types';
import { localPrompts } from './local_prompt_object';
import { getLlmType } from '../../routes/utils';
import { promptSavedObjectType } from '../../../common/constants';
interface GetPromptArgs {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connector?: Connector;
  connectorId: string;
  model?: string;
  promptId: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}
interface GetPromptsByGroupIdArgs extends Omit<GetPromptArgs, 'promptId'> {
  promptGroupId: string;
  promptIds: string[];
}

type PromptArray = Array<{ promptId: string; prompt: string }>;
/**
 * Get prompts by feature
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client
 * @param connector - connector, provide if available. No need to provide model and provider in this case
 * @param connectorId - connector id
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
  model: providedModel,
  promptGroupId,
  promptIds,
  provider: providedProvider,
  savedObjectsClient,
}: GetPromptsByGroupIdArgs): Promise<PromptArray> => {
  const { provider, model } = await resolveProviderAndModel(
    providedProvider,
    providedModel,
    connectorId,
    actionsClient,
    connector
  );

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    searchFields: ['promptId'],
    search: `${promptGroupId}-*`,
  });
  const promptsOnly = prompts?.saved_objects.map((p) => p.attributes) || [];

  return promptIds.map((promptId) => ({
    promptId,
    prompt:
      findPromptEntry(
        promptsOnly.filter((p) => p.promptId === promptId) || [],
        promptId,
        provider,
        model
      ) || '',
  }));
};

/**
 * Get prompt by promptId
 * provide either model + provider or connector to avoid additional calls to get connector
 * @param actionsClient - actions client
 * @param connector - connector, provide if available. No need to provide model and provider in this case
 * @param connectorId - connector id
 * @param model - model. No need to provide if connector provided
 * @param promptId - prompt id
 * @param provider  - provider. No need to provide if connector provided
 * @param savedObjectsClient - saved objects client
 */
export const getPrompt = async ({
  actionsClient,
  connector,
  connectorId,
  model: providedModel,
  promptId,
  provider: providedProvider,
  savedObjectsClient,
}: GetPromptArgs): Promise<string> => {
  const { provider, model } = await resolveProviderAndModel(
    providedProvider,
    providedModel,
    connectorId,
    actionsClient,
    connector
  );

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    searchFields: ['promptId'],
    search: promptId,
    fields: ['provider', 'model', 'prompt'],
  });

  return (
    findPromptEntry(
      prompts?.saved_objects.map((p) => p.attributes) || [],
      promptId,
      provider,
      model
    ) || ''
  );
};

const resolveProviderAndModel = async (
  providedProvider: string | undefined,
  providedModel: string | undefined,
  connectorId: string,
  actionsClient: PublicMethodsOf<ActionsClient>,
  providedConnector?: Connector
): Promise<{ provider?: string; model?: string }> => {
  let model = providedModel;
  let provider = providedProvider;
  if (!provider || !model || provider === 'inference') {
    const connector = providedConnector || (await actionsClient.get({ id: connectorId }));

    if (provider === 'inference' && connector.config) {
      provider = connector.config.provider || provider;
      model = connector.config.providerConfig?.model_id || model;

      if (provider === 'elastic' && model) {
        provider = elasticModelDictionary[model]?.provider || 'inference';
        model = elasticModelDictionary[model]?.model;
      }
    } else if (connector.config) {
      provider = provider || getLlmType(connector.actionTypeId);
      model = model || connector.config.defaultModel;
    }
  }

  return { provider: provider === 'inference' ? 'bedrock' : provider, model };
};

const findPrompt = (
  list: Array<{ provider?: string; model?: string; prompt: { default: string } }>,
  conditions: Array<(prompt: { provider?: string; model?: string }) => boolean>
): string | undefined => {
  for (const condition of conditions) {
    const match = list.find(condition);
    if (match) return match.prompt.default;
  }
  return undefined;
};

const findPromptEntry = (
  prompts: Prompt[],
  promptId: string,
  provider?: string,
  model?: string
): string | undefined => {
  const conditions = [
    (prompt: { provider?: string; model?: string }) =>
      prompt.provider === provider && prompt.model === model,
    (prompt: { provider?: string; model?: string }) =>
      prompt.provider === provider && !prompt.model,
    (prompt: { provider?: string; model?: string }) => !prompt.provider && !prompt.model,
  ];

  return (
    findPrompt(prompts, conditions) ??
    findPrompt(
      localPrompts.filter((p) => p.promptId === promptId),
      conditions
    )
  );
};
