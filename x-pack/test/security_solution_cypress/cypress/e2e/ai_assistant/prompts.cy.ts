/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/user/translations';
import { PromptCreateProps } from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';
import { QUICK_PROMPT_BADGE, USER_PROMPT } from '../../screens/ai_assistant';
import { createRule } from '../../tasks/api_calls/rules';
import {
  assertEmptySystemPrompt,
  assertErrorResponse,
  assertMessageSent,
  assertSystemPromptSelected,
  assertSystemPromptSent,
  clearSystemPrompt,
  createQuickPrompt,
  createSystemPrompt,
  openAssistant,
  resetConversation,
  selectConversation,
  selectSystemPrompt,
  sendQuickPrompt,
  typeAndSendMessage,
} from '../../tasks/assistant';
import {
  deleteConversations,
  deletePrompts,
  waitForCreatePrompts,
} from '../../tasks/api_calls/assistant';
import { createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { login } from '../../tasks/login';
import { visit, visitGetStartedPage } from '../../tasks/navigation';
import { getNewRule } from '../../objects/rule';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { expandFirstAlert } from '../../tasks/alerts';

const promptType: PromptCreateProps['promptType'] = 'system';
const testPrompt = {
  name: 'Cool prompt',
  content: 'This is a super cool prompt.',
};

const customPrompt1 = {
  name: 'Custom system prompt',
  content: 'This is a custom system prompt.',
  promptType,
};
const customPrompt2 = {
  name: 'Enhanced system prompt',
  content: 'This is an enhanced system prompt.',
  promptType,
};

describe('AI Assistant Prompts', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteConnectors();
    deleteConversations();
    deletePrompts();
    login();
    createAzureConnector();
  });

  describe('System Prompts', () => {
    beforeEach(() => {
      waitForCreatePrompts([customPrompt2, customPrompt1]);
    });
    it('No prompt is selected by default, custom prompts can be selected and deselected', () => {
      visitGetStartedPage();
      openAssistant();
      assertEmptySystemPrompt();
      selectSystemPrompt(customPrompt2.name);
      selectSystemPrompt(customPrompt1.name);
      clearSystemPrompt();
    });
    it('Deselecting a system prompt prevents prompt from being sent. When conversation is then cleared, the prompt remains cleared.', () => {
      visitGetStartedPage();
      openAssistant();
      selectSystemPrompt(customPrompt2.name);
      clearSystemPrompt();
      typeAndSendMessage('hello');
      assertMessageSent('hello');
      // ensure response before clearing convo
      assertErrorResponse();
      resetConversation();
      assertEmptySystemPrompt();
      typeAndSendMessage('hello');
      assertMessageSent('hello');
    });

    it('Last selected system prompt persists in conversation', () => {
      visitGetStartedPage();
      openAssistant();
      selectSystemPrompt(customPrompt2.name);
      typeAndSendMessage('hello');
      assertSystemPromptSent(customPrompt2.content);
      assertMessageSent('hello', true);
      resetConversation();
      assertSystemPromptSelected(customPrompt2.name);
      selectConversation('Timeline');
      assertEmptySystemPrompt();
      selectConversation('Welcome');
      assertSystemPromptSelected(customPrompt2.name);
    });

    it('Add prompt from system prompt selector without setting a default conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createSystemPrompt(testPrompt.name, testPrompt.content);
      // we did not set a default conversation, so the prompt should not be set
      assertEmptySystemPrompt();
      selectSystemPrompt(testPrompt.name);
      typeAndSendMessage('hello');
      assertSystemPromptSent(testPrompt.content);
      assertMessageSent('hello', true);
    });

    it('Add prompt from system prompt selector and set multiple conversations (including current) as default conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createSystemPrompt(testPrompt.name, testPrompt.content, ['Welcome', 'Timeline']);
      assertSystemPromptSelected(testPrompt.name);
      typeAndSendMessage('hello');

      assertSystemPromptSent(testPrompt.content);
      assertMessageSent('hello', true);
      // ensure response before changing convo
      assertErrorResponse();
      selectConversation('Timeline');
      assertSystemPromptSelected(testPrompt.name);
      typeAndSendMessage('hello');

      assertSystemPromptSent(testPrompt.content);
      assertMessageSent('hello', true);
    });
  });
  describe('Quick Prompts', () => {
    it('Add a quick prompt and send it in the conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createQuickPrompt(testPrompt.name, testPrompt.content);
      sendQuickPrompt(testPrompt.name);
      assertMessageSent(testPrompt.content);
    });
    it('Add a quick prompt with context and it is only available in the selected context', () => {
      visitGetStartedPage();
      openAssistant();
      createQuickPrompt(testPrompt.name, testPrompt.content, ['Alert (from view)']);
      cy.get(QUICK_PROMPT_BADGE(testPrompt.name)).should('not.exist');
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      openAssistant('alert');
      cy.get(QUICK_PROMPT_BADGE(testPrompt.name)).should('be.visible');
      cy.get(USER_PROMPT).should(
        'have.text',
        EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N
      );
      cy.get(QUICK_PROMPT_BADGE(testPrompt.name)).click();
      cy.get(USER_PROMPT).should('have.text', testPrompt.content);
    });
    // TODO delete quick prompt
    // I struggled to do this since the element is hidden with css and I cannot get it to show
  });
});
