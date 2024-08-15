/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UPGRADE_CTA } from '../../screens/ai_assistant';
import { login } from '../../tasks/login';
import { assertConversationReadOnly, openAssistant } from '../../tasks/assistant';
import { visitGetStartedPage } from '../../tasks/navigation';

describe('AI Assistant - Basic License', { tags: ['@ess'] }, () => {
  beforeEach(() => {
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
    cy.get(UPGRADE_CTA).should('exist');
    assertConversationReadOnly();
  });
});
