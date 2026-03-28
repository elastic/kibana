/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CyIndexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { login, ROLE } from '../../../tasks/login';
import {
  ensureEndpointListPageAuthzAccess,
  ensureFleetPermissionDeniedScreen,
  getEndpointManagementPageList,
  getNoPrivilegesPage,
  openRowActionMenu,
  visitEndpointList,
  visitFleetAgentList,
} from '../../../screens';

const allPages = getEndpointManagementPageList();

describe(
  'User Roles for Security Complete PLI with Endpoint Complete addon - t1/t2 analyst',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
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
    let loadedEndpoints: CyIndexEndpointHosts;

    before(() => {
      indexEndpointHosts().then((response) => {
        loadedEndpoints = response;
      });
    });

    after(() => {
      if (loadedEndpoints) {
        loadedEndpoints.cleanup();
      }
    });

    [ROLE.t1_analyst, ROLE.t2_analyst].forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const deniedPages = allPages.filter((page) => page.id !== 'endpointList');

        beforeEach(() => {
          login(roleName);
        });

        it('should have READ access to Endpoint list and correct page access restrictions', () => {
          ensureEndpointListPageAuthzAccess('read', true);

          for (const { id, url } of deniedPages) {
            cy.visit(url);
            if (id === 'responseActionLog' && roleName === 't2_analyst') {
              getNoPrivilegesPage().should('not.exist');
            } else {
              getNoPrivilegesPage().should('exist');
            }
          }
        });

        it('should NOT have access to Fleet or execute response actions', () => {
          visitFleetAgentList();
          ensureFleetPermissionDeniedScreen();

          visitEndpointList();
          openRowActionMenu().findByTestSubj('console').should('not.exist');
        });
      });
    });
  }
);
