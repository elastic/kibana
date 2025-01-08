/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startBasicLicense } from '../../tasks/api_calls/licensing';
import { UPGRADE_CTA } from '../../screens/ai_assistant';
import { login } from '../../tasks/login';
import { assertConversationReadOnly, openAssistant } from '../../tasks/assistant';
import { visitGetStartedPage } from '../../tasks/navigation';

describe('AI Assistant - Basic License', { tags: ['@ess'] }, () => {
  beforeEach(() => {
    login();
    startBasicLicense();
    visitGetStartedPage();
  });

  it('user with Basic license should not be able to use assistant', () => {
    openAssistant();
    cy.get(UPGRADE_CTA).should('be.visible');
    assertConversationReadOnly();
  });
});
