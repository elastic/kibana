/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockActionConnector } from '@kbn/alerts-ui-shared/src/common/test_utils/connector.mock';
import type { AIConnector } from '@kbn/elastic-assistant';

export const getMockConnectors = (): AIConnector[] => [
  createMockActionConnector({
    actionTypeId: '.gen-ai',
    isPreconfigured: true,
    id: 'gpt41Azure',
    name: 'GPT-4.1',
  }),
  createMockActionConnector({
    actionTypeId: '.gemini',
    isPreconfigured: true,
    id: 'gemini_2_5_pro',
    name: 'Gemini 2.5 Pro',
  }),
  createMockActionConnector({
    actionTypeId: '.bedrock',
    isPreconfigured: true,
    id: 'pmeClaudeV37SonnetUsEast1',
    name: 'Claude 3.7 Sonnet',
  }),
  createMockActionConnector({
    actionTypeId: '.inference',
    isPreconfigured: true,
    id: 'elastic-llm',
    name: 'Elastic LLM',
  }),
];
