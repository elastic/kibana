/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockConnectorForUI } from '@kbn/actions-plugin/server/application/connector/mocks';
import type { AIConnector } from '@kbn/elastic-assistant';

export const getMockConnectors = (): AIConnector[] => [
  createMockConnectorForUI({
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
    id: 'gpt41Azure',
    name: 'GPT-4.1',
  }),
  createMockConnectorForUI({
    actionTypeId: '.gemini',
    isPreconfigured: true,
    id: 'gemini_2_5_pro',
    name: 'Gemini 2.5 Pro',
  }),
  createMockConnectorForUI({
    actionTypeId: '.bedrock',
    isPreconfigured: true,
    id: 'pmeClaudeV37SonnetUsEast1',
    name: 'Claude 3.7 Sonnet',
  }),
  createMockConnectorForUI({
    actionTypeId: '.inference',
    isPreconfigured: true,
    id: 'elastic-llm',
    name: 'Elastic LLM',
  }),
];
