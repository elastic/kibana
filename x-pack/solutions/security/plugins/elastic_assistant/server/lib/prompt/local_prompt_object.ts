/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Prompt } from './types';
import {
  ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_INSIGHTS,
  ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
  ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_TITLE,
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
  BEDROCK_SYSTEM_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  GEMINI_SYSTEM_PROMPT,
  GEMINI_USER_PROMPT,
  STRUCTURED_SYSTEM_PROMPT,
} from './prompts';

export const promptGroupId = {
  attackDiscovery: 'attackDiscovery',
  aiAssistant: 'aiAssistant',
};

// preface all prompts with 'promptGroupId.id' to allow searching by promptGroupId
export const promptDictionary = {
  systemPrompt: `${promptGroupId.aiAssistant}-systemPrompt`,
  userPrompt: `${promptGroupId.aiAssistant}-userPrompt`,
  attackDiscoveryDefault: `${promptGroupId.attackDiscovery}-default`,
  attackDiscoveryRefine: `${promptGroupId.attackDiscovery}-refine`,
  attackDiscoveryContinue: `${promptGroupId.attackDiscovery}-continue`,
  attackDiscoveryDetailsMarkdown: `${promptGroupId.attackDiscovery}-detailsMarkdown`,
  attackDiscoveryEntitySummaryMarkdown: `${promptGroupId.attackDiscovery}-entitySummaryMarkdown`,
  attackDiscoveryMitreAttackTactics: `${promptGroupId.attackDiscovery}-mitreAttackTactics`,
  attackDiscoverySummaryMarkdown: `${promptGroupId.attackDiscovery}-summaryMarkdown`,
  attackDiscoveryGenerationTitle: `${promptGroupId.attackDiscovery}-generationTitle`,
  attackDiscoveryGenerationInsights: `${promptGroupId.attackDiscovery}-generationInsights`,
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
  {
    promptId: promptDictionary.attackDiscoveryDetailsMarkdown,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryEntitySummaryMarkdown,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryMitreAttackTactics,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
    },
  },
  {
    promptId: promptDictionary.attackDiscoverySummaryMarkdown,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryGenerationTitle,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_TITLE,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryGenerationInsights,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_INSIGHTS,
    },
  },
];
