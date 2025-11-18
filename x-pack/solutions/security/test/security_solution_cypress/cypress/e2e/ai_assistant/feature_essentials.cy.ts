/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AI_ASSISTANT_BUTTON } from '../../screens/ai_assistant';
import { login } from '../../tasks/login';
import { visitGetStartedPage } from '../../tasks/navigation';

describe(
  'App Features for Security Essentials',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
    });

    it('should not have AI Assistant available', () => {
      visitGetStartedPage();
      cy.get(AI_ASSISTANT_BUTTON).should('not.exist');
    });
  }
);
