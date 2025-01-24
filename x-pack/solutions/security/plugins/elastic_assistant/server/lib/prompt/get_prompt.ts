/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { ElasticModelDictionary, Prompt } from './types';
import { localPrompts } from './local_prompt_object';
import { getLlmType } from '../../routes/utils';
import { promptSavedObjectType } from '../../../common/constants';
interface GetPromptArgs {
  savedObjectsClient: SavedObjectsClientContract;
  promptId: string;
  provider?: string;
  model?: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
}
const elasticModelDictionary: ElasticModelDictionary = {
  'rainbow-sprinkles': {
    provider: 'bedrock',
    model: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
  },
};

export const getPrompt = async ({
  savedObjectsClient,
  promptId,
  model: providedModel,
  provider: providedProvider,
  actionsClient,
  connectorId,
}: GetPromptArgs): Promise<string> => {
  const { provider, model } = await resolveProviderAndModel(
    providedProvider,
    providedModel,
    connectorId,
    actionsClient
  );

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    searchFields: ['promptId'],
    search: promptId,
    fields: ['provider', 'model', 'prompt'],
  });

  return (
    findPromptEntry(
      prompts.saved_objects.map((p) => p.attributes),
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
  actionsClient: PublicMethodsOf<ActionsClient>
): Promise<{ provider?: string; model?: string }> => {
  let model = providedModel;
  let provider = providedProvider;
  if (!provider || !model || provider === 'inference') {
    const connector = await actionsClient.get({ id: connectorId });

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
