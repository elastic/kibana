/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Prompt } from '@kbn/security-ai-prompts';
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
  BEDROCK_CHAT_TITLE,
  GEMINI_CHAT_TITLE,
  DEFAULT_CHAT_TITLE,
  DEFEND_INSIGHTS,
} from './prompts';

export const promptGroupId = {
  attackDiscovery: 'attackDiscovery',
  aiAssistant: 'aiAssistant',
  defendInsights: {
    incompatibleAntivirus: 'defendInsights-incompatibleAntivirus',
  },
};

export const promptDictionary = {
  systemPrompt: `systemPrompt`,
  userPrompt: `userPrompt`,
  chatTitle: `chatTitle`,
  attackDiscoveryDefault: `default`,
  attackDiscoveryRefine: `refine`,
  attackDiscoveryContinue: `continue`,
  attackDiscoveryDetailsMarkdown: `detailsMarkdown`,
  attackDiscoveryEntitySummaryMarkdown: `entitySummaryMarkdown`,
  attackDiscoveryMitreAttackTactics: `mitreAttackTactics`,
  attackDiscoverySummaryMarkdown: `summaryMarkdown`,
  attackDiscoveryGenerationTitle: `generationTitle`,
  attackDiscoveryGenerationInsights: `generationInsights`,
  defendInsightsIncompatibleAntivirusDefault: `defendInsights-incompatibleAntivirusDefault`,
  defendInsightsIncompatibleAntivirusRefine: `defendInsights-incompatibleAntivirusRefine`,
  defendInsightsIncompatibleAntivirusContinue: `defendInsights-incompatibleAntivirusContinue`,
  defendInsightsIncompatibleAntivirusGroup: 'defendInsights-incompatibleAntivirusGroup',
  defendInsightsIncompatibleAntivirusEvents: 'defendInsights-incompatibleAntivirusEvents',
  defendInsightsIncompatibleAntivirusEventsId: 'defendInsights-incompatibleAntivirusEventsId',
  defendInsightsIncompatibleAntivirusEventsEndpointId:
    'defendInsights-incompatibleAntivirusEventsEndpointId',
  defendInsightsIncompatibleAntivirusEventsValue: 'defendInsights-incompatibleAntivirusEventsValue',
};

export const localPrompts: Prompt[] = [
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'openai',
    prompt: {
      default: DEFAULT_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    prompt: {
      default: DEFAULT_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'bedrock',
    prompt: {
      default: BEDROCK_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'gemini',
    prompt: {
      default: GEMINI_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.systemPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'openai',
    model: 'oss',
    prompt: {
      default: STRUCTURED_SYSTEM_PROMPT,
    },
  },
  {
    promptId: promptDictionary.userPrompt,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'gemini',
    prompt: {
      default: GEMINI_USER_PROMPT,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryDefault,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_DEFAULT,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryRefine,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_REFINE,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryContinue,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_CONTINUE,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryDetailsMarkdown,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryEntitySummaryMarkdown,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryMitreAttackTactics,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
    },
  },
  {
    promptId: promptDictionary.attackDiscoverySummaryMarkdown,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryGenerationTitle,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_TITLE,
    },
  },
  {
    promptId: promptDictionary.attackDiscoveryGenerationInsights,
    promptGroupId: promptGroupId.attackDiscovery,
    prompt: {
      default: ATTACK_DISCOVERY_GENERATION_INSIGHTS,
    },
  },
  {
    promptId: promptDictionary.chatTitle,
    promptGroupId: promptGroupId.aiAssistant,
    prompt: {
      default: DEFAULT_CHAT_TITLE,
    },
  },
  {
    promptId: promptDictionary.chatTitle,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'bedrock',
    prompt: {
      default: BEDROCK_CHAT_TITLE,
    },
  },
  {
    promptId: promptDictionary.chatTitle,
    promptGroupId: promptGroupId.aiAssistant,
    provider: 'gemini',
    prompt: {
      default: GEMINI_CHAT_TITLE,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusDefault,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.DEFAULT,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusRefine,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.REFINE,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusContinue,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.CONTINUE,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusGroup,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.GROUP,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusEvents,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusEventsId,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS_ID,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusEventsEndpointId,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS_ENDPOINT_ID,
    },
  },
  {
    promptId: promptDictionary.defendInsightsIncompatibleAntivirusEventsValue,
    promptGroupId: promptGroupId.defendInsights.incompatibleAntivirus,
    prompt: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS_VALUE,
    },
  },
];
