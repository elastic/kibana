/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import {
  BEDROCK_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  GEMINI_USER_PROMPT,
  STRUCTURED_SYSTEM_PROMPT,
} from './prompts';
import { getLlmType } from '../../routes/utils';
import { promptSavedObjectType } from '../../../common/constants';

export const promptDictionary = {
  systemPrompt: 'systemPrompt-default',
  userPrompt: 'userPrompt-default',
};

interface GetPromptArgs {
  savedObjectsClient: SavedObjectsClientContract;
  promptId: string;
  provider?: string;
  model?: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
}
interface ElasticModelDictionary {
  [key: string]: {
    provider: string;
    model: string;
  };
}

interface Prompt {
  promptId: string;
  prompt: {
    default: string;
  };
  provider?: string;
  model?: string;
  description?: string;
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
  let model = providedModel;
  let provider = providedProvider;
  if (!provider || !model || provider === 'inference') {
    const connector = await actionsClient.get({ id: connectorId });
    // At least one of 'provider' or 'model' is missing, get it from connector details
    if (provider === 'inference' && !!connector.config) {
      provider = connector.config.provider || provider;
      model = connector.config.providerConfig?.model_id || model;
      if (provider === 'elastic' && !!model) {
        // default back to inference if no provider exists for the model
        provider = elasticModelDictionary[model]?.provider || 'inference';
        model = elasticModelDictionary[model]?.model;
      }
    } else if (provider !== 'inference' && !!connector.config) {
      provider = provider || getLlmType(connector.actionTypeId);
      model = model || connector.config.defaultModel;
    }
  }

  // if after all of this, provider is still inference, treat as Bedrock
  if (provider === 'inference') {
    provider = 'bedrock';
  }

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    searchFields: ['promptId'],
    search: promptId,
    fields: ['provider', 'model', 'prompt'],
  });

  return findPromptEntry(prompts.saved_objects, promptId, provider, model) || '';
};

const findPromptEntry = (
  prompts: Array<SavedObject<Prompt>>,
  promptId: string,
  provider?: string,
  model?: string
) => {
  const backupPrompts = localPrompts.filter((p) => p.attributes.promptId === promptId);
  // Try to find the entry with matching provider and model
  let entry = prompts.find(
    (prompt) => prompt.attributes.provider === provider && prompt.attributes.model === model
  );
  if (!entry) {
    // If no match, try to find an entry with matching provider
    entry = prompts.find(
      (prompt) => prompt.attributes.provider === provider && !prompt.attributes.model
    );
  }

  if (!entry) {
    // If still no match, find the entry without provider or model
    entry = prompts.find((prompt) => !prompt.attributes.provider && !prompt.attributes.model);
  }

  // find local prompt definitions if still no entries

  if (!entry) {
    // If still no match, find the entry without provider or model
    entry = backupPrompts.find(
      (prompt) => prompt.attributes.provider === provider && prompt.attributes.model === model
    );
  }
  if (!entry) {
    // If no match, try to find an entry with matching provider
    entry = backupPrompts.find(
      (prompt) => prompt.attributes.provider === provider && !prompt.attributes.model
    );
  }

  if (!entry) {
    // If still no match, find the entry without provider or model
    entry = backupPrompts.find(
      (prompt) => prompt.attributes.provider === provider && !prompt.attributes.model
    );
  }

  return entry?.attributes?.prompt?.default;
};

const defaultSavedObject = {
  id: '',
  references: [],
  type: 'security-ai-prompt',
};

const localPrompts: Array<SavedObject<Prompt>> = [
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      provider: 'openai',
      prompt: {
        default: DEFAULT_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      prompt: {
        default: DEFAULT_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      provider: 'bedrock',
      prompt: {
        default: BEDROCK_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      provider: 'gemini',
      prompt: {
        default: GEMINI_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      provider: 'openai',
      model: 'oss',
      prompt: {
        default: STRUCTURED_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.userPrompt,
      provider: 'gemini',
      prompt: {
        default: GEMINI_USER_PROMPT,
      },
    },
  },
];
