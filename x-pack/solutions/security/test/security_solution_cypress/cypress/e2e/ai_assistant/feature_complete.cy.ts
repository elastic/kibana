/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_ASSISTANT_BUTTON } from '../../screens/ai_assistant';
import { login } from '../../tasks/login';
import { setPreferredChatExperienceToClassic } from '../../tasks/api_calls/kibana_advanced_settings';
import { visitGetStartedPage } from '../../tasks/navigation';

describe('App Features for Security Complete', { tags: ['@serverless'] }, () => {
  beforeEach(() => {
    login();
    setPreferredChatExperienceToClassic();
  });

  it('should have AI Assistant available', () => {
    visitGetStartedPage();
    cy.get(AI_ASSISTANT_BUTTON).should('be.visible');
  });
});
