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

      it('should have CRUD access to all artifact pages', () => {
        for (const { id } of artifactPagesFullAccess) {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        }
      });

      it('should have access to granted pages and Fleet', () => {
        for (const { url } of grantedAccessPages) {
          cy.visit(url);
          getNoPrivilegesPage().should('not.exist');
        }

        // Fleet access
        visitFleetAgentList();
        getFleetAgentListTable().should('exist');
      });

      it('should have access to all response actions', () => {
        visitEndpointList();
        openConsoleFromEndpointList();
        openConsoleHelpPanel();

        Object.entries(consoleHelpPanelResponseActionsTestSubj).forEach(([, testSubj]) => {
          cy.getByTestSubj(testSubj).should('exist');
        });
      });
    });
  }
);
