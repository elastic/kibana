/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, ROLE } from '../../../tasks/login';
import type { EndpointArtifactPageId } from '../../../screens';
import {
  ensureArtifactPageAuthzAccess,
  ensureFleetPermissionDeniedScreen,
  getEndpointManagementPageMap,
  getNoPrivilegesPage,
  visitFleetAgentList,
} from '../../../screens';

const pageById = getEndpointManagementPageMap();

// FLAKY: https://github.com/elastic/kibana/issues/170985
describe.skip(
  'Roles for Security Essential PLI with Endpoint Essentials addon - soc manager',
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
    describe('for role: soc_manager', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.trustedDevices,
        pageById.eventFilters,
        pageById.blocklist,
      ];
      const grantedAccessPages = [pageById.endpointList, pageById.policyList];

      beforeEach(() => {
        login(ROLE.soc_manager);
      });

      it('should have CRUD access to artifact pages, granted pages, no HIE access, and no Fleet', () => {
        for (const { id } of artifactPagesFullAccess) {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        }

        for (const { url } of grantedAccessPages) {
          cy.visit(url);
          getNoPrivilegesPage().should('not.exist');
        }

        ensureArtifactPageAuthzAccess(
          'none',
          pageById.hostIsolationExceptions.id as EndpointArtifactPageId
        );

        visitFleetAgentList();
        ensureFleetPermissionDeniedScreen();
      });
    });
  }
);
