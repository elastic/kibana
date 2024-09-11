/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUPERHERO_SYSTEM_PROMPT_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/system/translations';
import { EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N } from '@kbn/security-solution-plugin/public/assistant/content/prompts/user/translations';
import { QUICK_PROMPT_BADGE, USER_PROMPT } from '../../screens/ai_assistant';
import { createRule } from '../../tasks/api_calls/rules';
import {
  assertErrorResponse,
  assertMessageSent,
  assertSystemPrompt,
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
import { deleteConversations, deletePrompts } from '../../tasks/api_calls/assistant';
import { createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { login } from '../../tasks/login';
import { visit, visitGetStartedPage } from '../../tasks/navigation';
import { getNewRule } from '../../objects/rule';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { expandFirstAlert } from '../../tasks/alerts';

const testPrompt = {
  title: 'Cool prompt',
  prompt: 'This is a super cool prompt.',
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
      createSystemPrompt(testPrompt.title, testPrompt.prompt, [
        'Welcome',
        'Alert summary',
        'Data Quality Dashboard',
      ]);
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
  });
  describe('User Prompts', () => {
    it('Add a quick prompt and send it in the conversation', () => {
      visitGetStartedPage();
      openAssistant();
      createQuickPrompt(testPrompt.title, testPrompt.prompt);
      sendQuickPrompt(testPrompt.title);
      assertMessageSent(testPrompt.prompt, true);
    });
    it('Add a quick prompt with context and it is only available in the selected context', () => {
      visitGetStartedPage();
      openAssistant();
      createQuickPrompt(testPrompt.title, testPrompt.prompt, ['Alert (from view)']);
      cy.get(QUICK_PROMPT_BADGE(testPrompt.title)).should('not.exist');
      createRule(getNewRule());
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
      expandFirstAlert();
      openAssistant('alert');
      cy.get(QUICK_PROMPT_BADGE(testPrompt.title)).should('be.visible');
      cy.get(USER_PROMPT).should(
        'have.text',
        EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N
      );
      cy.get(QUICK_PROMPT_BADGE(testPrompt.title)).click();
      cy.get(USER_PROMPT).should('have.text', testPrompt.prompt);
    });
    // TODO delete quick prompt
    // I struggled to do this since the element is hidden with css and I cannot get it to show
  });
});
