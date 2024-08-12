/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitGetStartedPage } from '../../tasks/navigation';
import { AI_ASSISTANT_BUTTON } from '../../screens/ai_assistant';
import { login } from '../../tasks/login';

describe(
  'AI Assistant Conversations',
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
      login();
    });
    it('Opens a new conversation', () => {
      visitGetStartedPage();
      cy.get(AI_ASSISTANT_BUTTON).should('exist');
    });
  }
);
