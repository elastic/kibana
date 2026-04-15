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
  ensureEndpointListPageAuthzAccess,
  getArtifactListEmptyStateAddButton,
  getEndpointManagementPageList,
  getEndpointManagementPageMap,
  getNoPrivilegesPage,
  openRowActionMenu,
  visitEndpointList,
  visitFleetAgentList,
  ensureFleetPermissionDeniedScreen,
} from '../../../screens';

const allPages = getEndpointManagementPageList();
const pageById = getEndpointManagementPageMap();

describe(
  'User Roles for Security Complete PLI with Endpoint Complete addon - threat intelligence analyst',
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

    describe('for role: threat_intelligence_analyst', () => {
      const deniedPages = allPages.filter(({ id }) => id !== 'blocklist' && id !== 'endpointList');

      beforeEach(() => {
        login(ROLE.threat_intelligence_analyst);
      });

      it('should have access to Endpoint list page', () => {
        ensureEndpointListPageAuthzAccess('read', true);
      });

      it(`should have CRUD access to: Blocklist`, () => {
        cy.visit(pageById.blocklist.url);
        getArtifactListEmptyStateAddButton(pageById.blocklist.id as EndpointArtifactPageId).should(
          'exist'
        );
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

      it('should have access to Response Actions Log', () => {
        cy.visit(pageById.responseActionLog);
        getNoPrivilegesPage().should('not.exist');
      });

      it('should NOT have access to execute response actions', () => {
        visitEndpointList();
        openRowActionMenu().findByTestSubj('console').should('not.exist');
      });
    });
  }
);
