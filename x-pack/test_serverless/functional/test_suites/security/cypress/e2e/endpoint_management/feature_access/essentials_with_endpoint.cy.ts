/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../tasks/login';
import { getAgentListTable, visitFleetAgentList } from '../../../screens';
import { getEndpointManagementPageMap } from '../../../screens/endpoint_management';

describe(
  'App Features for Essentials PLI with Endpoint Essentials',
  {
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

    const allPages = getEndpointManagementPageMap();
    const allowedPages = [
      allPages.endpointList,
      allPages.policyList,
      allPages.trustedApps,
      allPages.blocklist,
      allPages.eventFilters,
    ];
    const deniedPages = [allPages.responseActionLog, allPages.hostIsolationExceptions];

    for (const { url, title, pageTestSubj } of allowedPages) {
      it(`should allow access to ${title}`, () => {
        cy.visit(url);
        cy.getByTestSubj(pageTestSubj).should('exist');
      });
    }

    for (const { url, title } of deniedPages) {
      it(`should NOT allow access to ${title}`, () => {
        cy.visit(url);
        cy.getByTestSubj('noPrivilegesPage').should('exist');
      });
    }

    it(`should have access to Fleet`, () => {
      visitFleetAgentList();
      getAgentListTable().should('exist');
    });
  }
);
