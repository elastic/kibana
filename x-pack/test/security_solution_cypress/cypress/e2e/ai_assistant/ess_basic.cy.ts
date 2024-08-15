/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
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
import { visitGetStartedPage } from '../../tasks/navigation';

describe('AI Assistant - Basic License', { tags: ['@ess'] }, () => {
  beforeEach(() => {
      // deleteConnectors();
      // deleteConversations();
      // deletePrompts();
      login();
    cy.request({
      method: 'POST',
      url: '/api/license/start_basic?acknowledge=true',
      headers: {
        'kbn-xsrf': 'cypress-creds',
        'x-elastic-internal-origin': 'security-solution',
      },
    }).then(({ body }) => {
      cy.log(`body: ${JSON.stringify(body)}`);
      expect(body).contains({
        acknowledged: true,
        // basic_was_started: true,
      });
    });
      visitGetStartedPage();
  });

  it('user with Basic license should not be able to use assistant', () => {
    openAssistant();
    assertMessageSent('hello', true);
  });
});
