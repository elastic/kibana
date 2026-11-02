/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, ROLE } from '../../../tasks/login';
import {
  ensureEndpointListPageAuthzAccess,
  ensureFleetPermissionDeniedScreen,
  getEndpointManagementPageList,
  getNoPrivilegesPage,
  visitFleetAgentList,
} from '../../../screens';

const allPages = getEndpointManagementPageList();

// FLAKY: https://github.com/elastic/kibana/issues/170985
describe.skip(
  'Roles for Security Essential PLI with Endpoint Essentials addon - t1/t2 analyst',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
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
    [ROLE.t1_analyst, ROLE.t2_analyst].forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const deniedPages = allPages.filter((page) => page.id !== 'endpointList');

        beforeEach(() => {
          login(roleName);
        });

        it('should have READ access to Endpoint list page', () => {
          ensureEndpointListPageAuthzAccess('read', true);
        });

        for (const { url, title } of deniedPages) {
          it(`should NOT have access to: ${title}`, () => {
            cy.visit(url);
            getNoPrivilegesPage().should('exist');
          });
        }

        it('should NOT have access to Fleet', () => {
          visitFleetAgentList();
          ensureFleetPermissionDeniedScreen();
        });
      });
    });
  }
);
