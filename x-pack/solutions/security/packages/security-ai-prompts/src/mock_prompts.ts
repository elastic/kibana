/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Prompt } from './types';

export const promptGroupId = {
  attackDiscovery: 'attackDiscovery',
  aiAssistant: 'aiAssistant',
};

export const promptDictionary = {
  systemPrompt: `systemPrompt`,
  userPrompt: `userPrompt`,
  attackDiscoveryDefault: `default`,
  attackDiscoveryRefine: `refine`,
};

export const localPrompts: Prompt[] = [
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'openai',
    prompt: {
      default: 'provider:openai default system prompt',
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    prompt: {
      default: 'default system prompt',
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'bedrock',
    prompt: {
      default: 'provider:bedrock default system prompt',
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'gemini',
    prompt: {
      default: 'provider:gemini default system prompt',
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'openai',
    model: 'oss',
    prompt: {
      default: 'provider:openai model:oss default system prompt',
    },
  },
  {
    promptId: promptDictionary.userPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'gemini',
    prompt: {
      default: 'provider:gemini user prompt',
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryDefault,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: 'attack discovery default prompt',
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryRefine,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: 'attack discovery refine prompt',
    },
  },
];
