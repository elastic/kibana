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
  llm?: string;
  model?: string;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
}
interface ElasticModelDictionary {
  [key: string]: {
    llm: string;
    model: string;
  };
}

interface Prompt {
  promptId: string;
  prompt: {
    default: string;
  };
  llm?: string;
  model?: string;
  description?: string;
}

const elasticModelDictionary: ElasticModelDictionary = {
  'rainbow-sprinkles': {
    llm: 'bedrock',
    model: 'us.anthropic.claude-3-5-sonnet-20240620-v1:0',
  },
};
export const getPrompt = async ({
  savedObjectsClient,
  promptId,
  model: providedModel,
  llm: providedLlm,
  actionsClient,
  connectorId,
}: GetPromptArgs): Promise<string> => {
  let model = providedModel;
  let llm = providedLlm;
  if (!llm || !model || llm === 'inference') {
    const connector = await actionsClient.get({ id: connectorId });
    // At least one of 'llm' or 'model' is missing, get it from connector details
    if (llm === 'inference' && !!connector.config) {
      llm = connector.config.provider || llm;
      model = connector.config.providerConfig?.model_id || model;
      if (llm === 'elastic' && !!model) {
        // default back to inference if no llm exists for the model
        llm = elasticModelDictionary[model]?.llm || 'inference';
        model = elasticModelDictionary[model]?.model;
      }
    } else if (llm !== 'inference' && !!connector.config) {
      llm = llm || getLlmType(connector.actionTypeId);
      model = model || connector.config.defaultModel;
    }
  }

  // if after all of this, llm is still inference, treat as Bedrock
  if (llm === 'inference') {
    llm = 'bedrock';
  }

  const prompts = await savedObjectsClient.find<Prompt>({
    type: promptSavedObjectType,
    searchFields: ['promptId'],
    search: promptId,
    fields: ['llm', 'model', 'prompt'],
  });

  return findPromptEntry(prompts.saved_objects, promptId, llm, model) || '';
};

const findPromptEntry = (
  prompts: Array<SavedObject<Prompt>>,
  promptId: string,
  llm?: string,
  model?: string
) => {
  const backupPrompts = localPrompts.filter((p) => p.attributes.promptId === promptId);

  // Try to find the entry with matching llm and model
  let entry =
    prompts.find((prompt) => prompt.attributes.llm === llm && prompt.attributes.model === model) ||
    backupPrompts.find(
      (prompt) => prompt.attributes.llm === llm && prompt.attributes.model === model
    );
  if (!entry) {
    // If no match, try to find an entry with matching llm
    entry =
      prompts.find((prompt) => prompt.attributes.llm === llm && !prompt.attributes.model) ||
      backupPrompts.find((prompt) => prompt.attributes.llm === llm && !prompt.attributes.model);
  }

  if (!entry) {
    // If still no match, find the entry without llm or model
    entry =
      prompts.find((prompt) => !prompt.attributes.llm && !prompt.attributes.model) ||
      backupPrompts.find((prompt) => prompt.attributes.llm === llm && !prompt.attributes.model);
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
      llm: 'openai',
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
      llm: 'bedrock',
      prompt: {
        default: BEDROCK_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      llm: 'gemini',
      prompt: {
        default: GEMINI_SYSTEM_PROMPT,
      },
    },
  },
  {
    ...defaultSavedObject,
    attributes: {
      promptId: promptDictionary.systemPrompt,
      llm: 'openai',
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
      llm: 'gemini',
      prompt: {
        default: GEMINI_USER_PROMPT,
      },
    },
  },
];
