/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';

import { PAYWALL_DESCRIPTION } from '../../../screens/entity_analytics_serverless_splash';

// FLAKY: https://github.com/elastic/kibana/issues/165685
describe(
  'Entity Analytics Dashboard in Serverless',
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
      visitWithTimeRange(ENTITY_ANALYTICS_URL);
    });

    it('should display a splash screen when visited with Security essentials PLI ', () => {
      cy.get(PAYWALL_DESCRIPTION).should(
        'have.text',
        'Entity risk scoring capability is available in our Security Complete license tier'
      );
    });
  }
);
