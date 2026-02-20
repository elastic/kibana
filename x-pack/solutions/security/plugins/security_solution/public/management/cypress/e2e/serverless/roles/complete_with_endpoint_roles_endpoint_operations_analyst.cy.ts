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
  getConsoleHelpPanelResponseActionTestSubj,
  getFleetAgentListTable,
  openConsoleFromEndpointList,
  openConsoleHelpPanel,
  visitEndpointList,
  visitFleetAgentList,
} from '../../../screens';

const pageById = getEndpointManagementPageMap();
const consoleHelpPanelResponseActionsTestSubj = getConsoleHelpPanelResponseActionTestSubj();

describe(
  'User Roles for Security Complete PLI with Endpoint Complete addon - endpoint operations analyst',
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

    describe('for role: endpoint_operations_analyst', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.trustedDevices,
        pageById.eventFilters,
        pageById.blocklist,
        pageById.hostIsolationExceptions,
      ];

      const grantedAccessPages = [pageById.endpointList, pageById.policyList];

      beforeEach(() => {
        login(ROLE.endpoint_operations_analyst);
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

      Object.entries(consoleHelpPanelResponseActionsTestSubj).forEach(([action, testSubj]) => {
        it(`should have access to response action: ${action}`, () => {
          visitEndpointList();
          openConsoleFromEndpointList();
          openConsoleHelpPanel();
          cy.getByTestSubj(testSubj).should('exist');
        });
      });

      it('should have access to Fleet', () => {
        visitFleetAgentList();
        getFleetAgentListTable().should('exist');
      });
    });
  }
);
