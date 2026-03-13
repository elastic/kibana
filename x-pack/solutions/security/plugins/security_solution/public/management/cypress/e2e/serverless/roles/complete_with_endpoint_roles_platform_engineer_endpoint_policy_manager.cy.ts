/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CyIndexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { login, ROLE } from '../../../tasks/login';
import type { EndpointArtifactPageId } from '../../../screens';
import {
  ensureArtifactPageAuthzAccess,
  getEndpointManagementPageMap,
  getNoPrivilegesPage,
  getFleetAgentListTable,
  openRowActionMenu,
  visitEndpointList,
  visitFleetAgentList,
} from '../../../screens';

const pageById = getEndpointManagementPageMap();

describe(
  'User Roles for Security Complete PLI with Endpoint Complete addon - platform engineer & endpoint policy manager',
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

    [ROLE.platform_engineer, ROLE.endpoint_policy_manager].forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const artifactPagesFullAccess = [
          pageById.trustedApps,
          pageById.trustedDevices,
          pageById.eventFilters,
          pageById.blocklist,
          pageById.hostIsolationExceptions,
        ];
        const grantedAccessPages = [pageById.endpointList, pageById.policyList];

        beforeEach(() => {
          login(roleName);
        });

        for (const { id, title } of artifactPagesFullAccess) {
          it(`should have CRUD access to: ${title}`, () => {
            ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
          });
        }

        for (const { url, title } of grantedAccessPages) {
          it(`should have access to: ${title}`, () => {
            cy.visit(url);
            getNoPrivilegesPage().should('not.exist');
          });
        }

        it('should have access to Fleet', () => {
          visitFleetAgentList();
          getFleetAgentListTable().should('exist');
        });

        it('should have access to Response Actions Log', () => {
          cy.visit(pageById.responseActionLog);

          if (roleName === 'endpoint_policy_manager') {
            getNoPrivilegesPage().should('exist');
          } else {
            getNoPrivilegesPage().should('not.exist');
          }
        });

        it('should NOT have access to execute response actions', () => {
          visitEndpointList();
          openRowActionMenu().findByTestSubj('console').should('not.exist');
        });
      });
    });
  }
);
