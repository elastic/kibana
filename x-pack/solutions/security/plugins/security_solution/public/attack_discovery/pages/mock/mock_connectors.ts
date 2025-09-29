/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIConnector } from '@kbn/elastic-assistant';

export const getMockConnectors = (): AIConnector[] => [
  {
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
    isDeprecated: false,
    referencedByCount: 0,
    isSystemAction: false,
    id: 'gpt41Azure',
    name: 'GPT-4.1',
    isConnectorTypeDeprecated: false,
  },
  {
    actionTypeId: '.gemini',
    isPreconfigured: true,
    isDeprecated: false,
    referencedByCount: 0,
    isSystemAction: false,
    id: 'gemini_2_5_pro',
    name: 'Gemini 2.5 Pro',
    isConnectorTypeDeprecated: false,
  },
  {
    actionTypeId: '.bedrock',
    isPreconfigured: true,
    isDeprecated: false,
    referencedByCount: 0,
    isSystemAction: false,
    id: 'pmeClaudeV37SonnetUsEast1',
    name: 'Claude 3.7 Sonnet',
    isConnectorTypeDeprecated: false,
  },
  {
    actionTypeId: '.inference',
    isPreconfigured: true,
    isDeprecated: false,
    referencedByCount: 0,
    isSystemAction: false,
    id: 'elastic-llm',
    name: 'Elastic LLM',
    isConnectorTypeDeprecated: false,
  },
];
