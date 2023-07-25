/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexedHostsAndAlertsResponse } from '@kbn/security-solution-plugin/common/endpoint/index_data';
import { login } from '../../../tasks/login';
import {
  EndpointArtifactPageId,
  getEndpointManagementPageList,
  getEndpointManagementPageMap,
} from '../../../lib';
import {
  getNoPrivilegesPage,
  visitEndpointList,
  getArtifactListEmptyStateAddButton,
} from '../../../screens/endpoint_management';
import { ensurePermissionDeniedScreen, visitFleetAgentList } from '../../../screens';
import { ServerlessRoleName } from '../../../../../../../shared/lib';
import { visitPolicyList } from '../../../screens/endpoint_management';

describe(
  'Roles for Security Essential PLI with Endpoint Essentials addon',
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
    const allPages = getEndpointManagementPageList();
    const pageById = getEndpointManagementPageMap();

    let loadedEndpoints: IndexedHostsAndAlertsResponse;

    before(() => {
      cy.task('indexEndpointHosts', {}, { timeout: 240000 }).then((response) => {
        loadedEndpoints = response;
      });
    });

    after(() => {
      if (loadedEndpoints) {
        cy.task('deleteIndexedEndpointHosts', loadedEndpoints);
      }
    });

    // roles `t1_analyst` and `t2_analyst` are the same as far as endpoint access
    (['t1_analyst', `t2_analyst`] as ServerlessRoleName[]).forEach((roleName) => {
      describe(`for role: ${roleName}`, () => {
        const deniedPages = allPages.filter((page) => page.id !== 'endpointList');

        before(() => {
          login(roleName);
        });

        it('should have READ access to Endpoint list page', () => {
          visitEndpointList();
          getNoPrivilegesPage().should('not.exist');
        });

        for (const { url, title } of deniedPages) {
          it(`should NOT have access to: ${title}`, () => {
            cy.visit(url);
            getNoPrivilegesPage().should('exist');
          });
        }

        it('should NOT have access to Fleet', () => {
          visitFleetAgentList();
          ensurePermissionDeniedScreen();
        });
      });
    });

    describe('for role: t3_analyst', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.hostIsolationExceptions,
        pageById.blocklist,
      ];

      before(() => {
        login('t3_analyst');
      });

      it('should have access to Endpoint list page', () => {
        visitEndpointList();
        getNoPrivilegesPage().should('not.exist');
      });

      for (const { url, title, id } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          cy.visit(url);
          getArtifactListEmptyStateAddButton(id as EndpointArtifactPageId).should('exist');
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensurePermissionDeniedScreen();
      });
    });

    describe('for role: threat_intelligence_analyst', () => {
      const deniedPages = allPages.filter(({ id }) => id !== 'blocklist' && id !== 'endpointList');

      before(() => {
        login('threat_intelligence_analyst');
      });

      it('should have access to Endpoint list page', () => {
        visitEndpointList();
        getNoPrivilegesPage().should('not.exist');
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
        ensurePermissionDeniedScreen();
      });
    });

    describe('for role: rule_author', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
      ];

      before(() => {
        login('rule_author');
      });

      for (const { id, url, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          cy.visit(url);
          getArtifactListEmptyStateAddButton(id as EndpointArtifactPageId).should('exist');
        });
      }

      it('should have access to Endpoint list page', () => {
        visitEndpointList();
        getNoPrivilegesPage().should('not.exist');
      });

      it('should have access to policy management', () => {
        visitPolicyList();
        getNoPrivilegesPage().should('not.exist');
      });

      it(`should have Read access only to: Host Isolation Exceptions`, () => {
        cy.visit(pageById.hostIsolationExceptions.url);
        getArtifactListEmptyStateAddButton(
          pageById.hostIsolationExceptions.id as EndpointArtifactPageId
        ).should('not.exist');
      });

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensurePermissionDeniedScreen();
      });
    });

    describe('for role: soc_manager', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.eventFilters,
        pageById.blocklist,
        pageById.hostIsolationExceptions,
      ];
      const grantedAccessPages = [pageById.endpointList, pageById.policyList];

      before(() => {
        login('soc_manager');
      });

      for (const { id, url, title } of artifactPagesFullAccess) {
        it(`should have CRUD access to: ${title}`, () => {
          cy.visit(url);
          getArtifactListEmptyStateAddButton(id as EndpointArtifactPageId).should('exist');
        });
      }

      for (const { url, title } of grantedAccessPages) {
        it(`should have access to: ${title}`, () => {
          cy.visit(url);
          getNoPrivilegesPage().should('not.exist');
        });
      }

      it('should NOT have access to Fleet', () => {
        visitFleetAgentList();
        ensurePermissionDeniedScreen();
      });
    });

    // Endpoint Operations Manager and Platform Engineer currently have the same level of access
    (['platform_engineer', `endpoint_operations_manager`] as ServerlessRoleName[]).forEach(
      (roleName) => {
        describe(`for role: ${roleName}`, () => {
          const artifactPagesFullAccess = [
            pageById.trustedApps,
            pageById.eventFilters,
            pageById.blocklist,
            pageById.hostIsolationExceptions,
          ];
          const grantedAccessPages = [pageById.endpointList, pageById.policyList];

          before(() => {
            login('platform_engineer');
          });

          for (const { id, url, title } of artifactPagesFullAccess) {
            it(`should have CRUD access to: ${title}`, () => {
              cy.visit(url);
              getArtifactListEmptyStateAddButton(id as EndpointArtifactPageId).should('exist');
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
            ensurePermissionDeniedScreen();
          });
        });
      }
    );
  }
);
