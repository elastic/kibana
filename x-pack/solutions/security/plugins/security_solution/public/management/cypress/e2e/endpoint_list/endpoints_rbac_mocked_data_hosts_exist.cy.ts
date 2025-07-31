/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGE_POLICY_API_ROUTES } from '@kbn/fleet-plugin/common/constants/routes';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import { SIEM_VERSIONS } from '../../common/constants';

describe('Endpoints page RBAC - some hosts are enrolled', { tags: ['@ess'] }, () => {
  const PRIVILEGES = ['none', 'read', 'all'] as const;

  for (const siemVersion of SIEM_VERSIONS) {
    describe(siemVersion, () => {
      let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts>;

      before(() => {
        indexEndpointHosts({ count: 1 }).then((indexEndpoints) => {
          endpointData = indexEndpoints;
        });
      });

      after(() => {
        if (endpointData) {
          endpointData.cleanup();
          // @ts-expect-error ignore setting to undefined
          endpointData = undefined;
        }
      });

      beforeEach(() => {
        // if there is a request towards this API, it should return 200
        cy.intercept(PACKAGE_POLICY_API_ROUTES.BULK_GET_PATTERN, (req) => {
          req.on('response', (res) => {
            expect(res.statusCode).to.equal(200);
          });
        });
      });

      for (const endpointPolicyManagementPrivilege of PRIVILEGES) {
        describe(`endpoint policy management privilege is ${endpointPolicyManagementPrivilege}`, () => {
          for (const fleetPrivilege of PRIVILEGES) {
            for (const integrationsPrivilege of PRIVILEGES) {
              const shouldProvidePolicyLink = endpointPolicyManagementPrivilege !== 'none';

              it(`should show Endpoint list ${
                shouldProvidePolicyLink ? 'with' : 'without'
              } link to Endpoint Policy with fleet:${fleetPrivilege} and integrations:${integrationsPrivilege}`, () => {
                login.withCustomKibanaPrivileges({
                  [siemVersion]: [
                    'all',
                    `endpoint_list_all`,
                    `policy_management_${endpointPolicyManagementPrivilege}`,
                  ],
                  fleet: [integrationsPrivilege],
                  fleetv2: [fleetPrivilege],
                });

                loadPage(APP_ENDPOINTS_PATH);

                cy.getByTestSubj('policyNameCellLink').should('exist');
                cy.getByTestSubj('policyNameCellLink').within(() => {
                  if (shouldProvidePolicyLink) {
                    cy.get('a').should('have.attr', 'href');
                  } else {
                    cy.get('a').should('not.exist');
                  }
                });
              });
            }
          }
        });
      }
    });
  }
});
