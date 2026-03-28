/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  getEndpointManagementPageMap,
  visitFleetAgentList,
} from '../../../screens';

const pageById = getEndpointManagementPageMap();

// FLAKY: https://github.com/elastic/kibana/issues/170985
describe.skip(
  'Roles for Security Essential PLI with Endpoint Essentials addon - rule author',
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

    describe('for role: rule_author', () => {
      const artifactPagesFullAccess = [
        pageById.trustedApps,
        pageById.trustedDevices,
        pageById.eventFilters,
        pageById.blocklist,
      ];

      beforeEach(() => {
        login(ROLE.rule_author);
      });

      it('should have CRUD access to artifact pages, Endpoint list, and policy management', () => {
        for (const { id } of artifactPagesFullAccess) {
          ensureArtifactPageAuthzAccess('all', id as EndpointArtifactPageId);
        }

        ensureEndpointListPageAuthzAccess('all', true);

        ensurePolicyListPageAuthzAccess('all', true);
        ensurePolicyDetailsPageAuthzAccess(
          loadedEndpoints.data.integrationPolicies[0].id,
          'all',
          true
        );
      });

      it('should NOT have access to Host Isolation Exceptions or Fleet', () => {
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
