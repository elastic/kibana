/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Prompt } from './types';
import {
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
  BEDROCK_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  GEMINI_USER_PROMPT,
  STRUCTURED_SYSTEM_PROMPT,
} from './prompts';
export const promptFeatureId = {
  attackDiscovery: 'attackDiscovery',
  aiAssistant: 'aiAssistant',
};

// preface all prompts with 'promptFeatureId.id' to allow searching by promptFeatureId
export const promptDictionary = {
  systemPrompt: `${promptFeatureId.aiAssistant}-systemPrompt`,
  userPrompt: `${promptFeatureId.aiAssistant}-userPrompt`,
  // preface all attack discovery prompts with 'attackDiscovery' to allow searching like attackDiscovery-*
  attackDiscoveryDefault: `${promptFeatureId.attackDiscovery}-default`,
  attackDiscoveryRefine: `${promptFeatureId.attackDiscovery}-refine`,
  attackDiscoveryContinue: `${promptFeatureId.attackDiscovery}-continue`,
};

export const localPrompts: Prompt[] = [
  {
    promptId: promptDictionary.systemPrompt,
    provider: 'openai',
    prompt: {
      default: DEFAULT_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    prompt: {
      default: DEFAULT_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    provider: 'bedrock',
    prompt: {
      default: BEDROCK_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    provider: 'gemini',
    prompt: {
      default: GEMINI_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    provider: 'openai',
    model: 'oss',
    prompt: {
      default: STRUCTURED_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.userPrompt,
    provider: 'gemini',
    prompt: {
      default: GEMINI_USER_PROMPT,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryDefault,
    prompt: {
      default: ATTACK_DISCOVERY_DEFAULT,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryRefine,
    prompt: {
      default: ATTACK_DISCOVERY_REFINE,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryContinue,
    prompt: {
      default: ATTACK_DISCOVERY_CONTINUE,
    },
  },
];
