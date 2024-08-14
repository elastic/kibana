/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertErrorResponse,
  assertMessageSent,
  clearSystemPrompt,
  openAssistant,
  resetConversation,
  typeAndSendMessage,
} from '../../tasks/assistant';
import { deleteConversations } from '../../tasks/api_calls/assistant';
import { createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/api_calls/common';
import { login } from '../../tasks/login';
import { visitGetStartedPage } from '../../tasks/navigation';

describe(
  'AI Assistant Prompts',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'complete' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      deleteConnectors();
      deleteConversations();
      deleteAlertsAndRules();
      login();
      createAzureConnector();
    });

    it('Sends with the default system prompt', () => {
      visitGetStartedPage();
      openAssistant();
      typeAndSendMessage('hello');
      assertMessageSent('hello', true);
    });

    it.only('Deselecting default system prompt prevents prompt from being sent. When conversation is then cleared, the prompt is reset.', () => {
      visitGetStartedPage();
      openAssistant();
      clearSystemPrompt();
      typeAndSendMessage('hello');
      assertMessageSent('hello');
      // ensure response before clearing convo
      assertErrorResponse();
      resetConversation();
      typeAndSendMessage('hello');
      assertMessageSent('hello', true);
    });
  }
);
