/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_BASE_PATH } from '@kbn/fleet-plugin/public/constants';
import { login } from '../../../tasks/login';
import { getEndpointManagementPageList } from '../../../lib';

describe(
  'App Features for Complete PLI with Endpoint Complete',
  {
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

    const allPages = getEndpointManagementPageList();

    for (const { url, title, pageTestSubj } of allPages) {
      it(`should allow access to ${title}`, () => {
        cy.visit(url);
        cy.getByTestSubj(pageTestSubj).should('exist');
      });
    }

    it(`should have access to Fleet`, () => {
      cy.visit(FLEET_BASE_PATH);
      cy.getByTestSubj('fleetAgentListTable').should('exist');
    });
  }
);
