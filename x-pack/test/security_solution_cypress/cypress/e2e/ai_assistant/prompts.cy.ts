/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPERHERO_SYSTEM_PROMPT_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/system/translations';
import {
  assertErrorResponse,
  assertMessageSent,
  assertSystemPrompt,
  clearSystemPrompt,
  createSystemPrompt,
  openAssistant,
  resetConversation,
  selectConversation,
  selectSystemPrompt,
  typeAndSendMessage,
} from '../../tasks/assistant';
import { deleteConversations, deletePrompts } from '../../tasks/api_calls/assistant';
import { createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteAlertsAndRules, deleteConnectors } from '../../tasks/api_calls/common';
import { login } from '../../tasks/login';
import { visitGetStartedPage } from '../../tasks/navigation';

const testPrompt = {
  title: 'Cool prompt',
  prompt: 'This is a super cool prompt. ',
};
describe(
  'System Prompts',
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
      deletePrompts();
      login();
      createAzureConnector();
    });

    it('Deselecting default system prompt prevents prompt from being sent. When conversation is then cleared, the prompt is reset.', () => {
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

    it('Last selected system prompt persists in conversation', () => {
      visitGetStartedPage();
      openAssistant();
      selectSystemPrompt('Enhanced system prompt');
      typeAndSendMessage('hello');
      assertMessageSent('hello', true, SUPERHERO_SYSTEM_PROMPT_NON_I18N);
      resetConversation();
      assertSystemPrompt('Enhanced system prompt');
      selectConversation('Alert summary');
      assertSystemPrompt('Default system prompt');
      selectConversation('Welcome');
      assertSystemPrompt('Enhanced system prompt');
    });

    it('Add prompt from system prompt selector without setting a default conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createSystemPrompt(testPrompt.title, testPrompt.prompt);
      // we did not set a default conversation, so the prompt should not be set
      assertSystemPrompt('Default system prompt');
      selectSystemPrompt(testPrompt.title);
      typeAndSendMessage('hello');
      assertMessageSent('hello', true, testPrompt.prompt);
    });

    it('Add prompt from system prompt selector and set multiple conversations (including current) as default conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createSystemPrompt(testPrompt.title, testPrompt.prompt, ['Welcome', 'Alert summary']);
      assertSystemPrompt(testPrompt.title);
      typeAndSendMessage('hello');
      assertMessageSent('hello', true, testPrompt.prompt);
      // ensure response before changing convo
      assertErrorResponse();
      selectConversation('Alert summary');
      assertSystemPrompt(testPrompt.title);
      typeAndSendMessage('hello');
      assertMessageSent('hello', true, testPrompt.prompt);
    });
  }
);
