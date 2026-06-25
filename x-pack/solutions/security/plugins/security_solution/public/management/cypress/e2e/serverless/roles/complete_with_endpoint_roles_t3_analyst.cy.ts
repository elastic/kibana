/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { CyIndexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { indexEndpointHosts } from '../../../tasks/index_endpoint_hosts';
import { login, ROLE } from '../../../tasks/login';
import { ensurePolicyDetailsPageAuthzAccess } from '../../../screens/policy_details';
import type { EndpointArtifactPageId } from '../../../screens';
import {
  ensureArtifactPageAuthzAccess,
  ensureEndpointListPageAuthzAccess,
  ensurePolicyListPageAuthzAccess,
  ensureFleetPermissionDeniedScreen,
  getConsoleHelpPanelResponseActionTestSubj,
  getEndpointManagementPageMap,
  openConsoleFromEndpointList,
  openConsoleHelpPanel,
  visitEndpointList,
  visitFleetAgentList,
} from '../../../screens';

const pageById = getEndpointManagementPageMap();
const consoleHelpPanelResponseActionsTestSubj = getConsoleHelpPanelResponseActionTestSubj();

describe(
  'User Roles for Security Complete PLI with Endpoint Complete addon - t3 analyst',
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

    describe('for role: t3_analyst', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.trustedDevices,
        pageById.eventFilters,
        pageById.hostIsolationExceptions,
        pageById.blocklist,
      ];

      const grantedResponseActions = pick(
        consoleHelpPanelResponseActionsTestSubj,
        'isolate',
        'release',
        'processes',
        'kill-process',
        'suspend-process',
        'get-file',
        'upload',
        'scan'
      );

      const deniedResponseActions = pick(consoleHelpPanelResponseActionsTestSubj, 'execute');

      beforeEach(() => {
        login(ROLE.t3_analyst);
      });

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('all', true);
      });

      it('should have read access to Endpoint Policy Management', () => {
        ensurePolicyListPageAuthzAccess('read', true);
        ensurePolicyDetailsPageAuthzAccess(
          loadedEndpoints.data.integrationPolicies[0].id,
          'read',
          true
        );
      });

      for (const { title, id } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });

      describe('Response Actions access', () => {
        beforeEach(() => {
          visitEndpointList();
          openConsoleFromEndpointList();
          openConsoleHelpPanel();
        });

        for (const [action, testSubj] of Object.entries(grantedResponseActions)) {
          it(`should have access to execute action: ${action}`, () => {
            cy.getByTestSubj(testSubj).should('exist');
          });
        }

        for (const [action, testSubj] of Object.entries(deniedResponseActions)) {
          it(`should NOT have access to execute: ${action}`, () => {
            cy.getByTestSubj(testSubj).should('not.exist');
          });
        }
      });
    });
  }
);
