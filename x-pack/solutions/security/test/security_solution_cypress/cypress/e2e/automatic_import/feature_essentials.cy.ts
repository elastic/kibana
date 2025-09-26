/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSISTANT_BUTTON, CREATE_INTEGRATION_LANDING_PAGE } from '../../screens/automatic_import';
import { login } from '../../tasks/login';

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

    it('should not have Automatic Import available', () => {
      cy.visit(CREATE_INTEGRATION_LANDING_PAGE);
      cy.get(ASSISTANT_BUTTON).should('not.exist');
    });
  }
);
