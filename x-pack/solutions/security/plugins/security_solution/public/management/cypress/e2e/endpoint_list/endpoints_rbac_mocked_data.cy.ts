/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PACKAGE_POLICY_API_ROUTES } from '@kbn/fleet-plugin/common/constants/routes';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { getT1Analyst } from '../../../../../scripts/endpoint/common/roles_users';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';

describe('Endpoints RBAC', { tags: ['@ess'] }, () => {
  type Privilege = 'all' | 'read' | 'none';
  const PRIVILEGES: Privilege[] = ['none', 'read', 'all'];

  const loginWithCustomRole: (privileges: {
    integrationsPrivilege?: Privilege;
    fleetPrivilege?: Privilege;
    endpointPolicyManagementPrivilege?: Privilege;
  }) => void = ({
    integrationsPrivilege = 'none',
    fleetPrivilege = 'none',
    endpointPolicyManagementPrivilege = 'none',
  }) => {
    const base = getT1Analyst();

    const customRole: typeof base = {
      ...base,
      kibana: [
        {
          ...base.kibana[0],
          feature: {
            ...base.kibana[0].feature,
            siem: [
              ...base.kibana[0].feature.siem,
              `endpoint_list_all`,
              `policy_management_${endpointPolicyManagementPrivilege}`,
            ],
            fleet: [integrationsPrivilege],
            fleetv2: [fleetPrivilege],
          },
        },
      ],
    };

    login.withCustomRole({ name: 'customRole', ...customRole });
  };

  beforeEach(() => {
    login();
  });

  describe('neither Defend policy nor hosts are present', () => {
    for (const endpointPolicyManagementPrivilege of PRIVILEGES) {
      describe(`endpoint policy management privilege is ${endpointPolicyManagementPrivilege}`, () => {
        for (const fleetPrivilege of PRIVILEGES) {
          for (const integrationsPrivilege of PRIVILEGES) {
            const shouldAllowOnboarding =
              fleetPrivilege === 'all' && integrationsPrivilege === 'all';

            it(`should show onboarding screen ${
              shouldAllowOnboarding ? 'with' : 'without'
            } 'Add Elastic Defend' button with fleet:${fleetPrivilege} and integrations:${integrationsPrivilege}`, () => {
              loginWithCustomRole({
                endpointPolicyManagementPrivilege,
                fleetPrivilege,
                integrationsPrivilege,
              });

              loadPage(APP_ENDPOINTS_PATH);

              cy.getByTestSubj('policyOnboardingInstructions').should('exist');
              if (shouldAllowOnboarding) {
                cy.getByTestSubj('onboardingStartButton').should('exist');
              } else {
                cy.getByTestSubj('onboardingStartButton').should('not.exist');
              }
            });
          }
        }
      });
    }
  });

  describe('Defend policy is present, but no hosts', () => {
    let loadedPolicyData: IndexedFleetEndpointPolicyResponse;

    before(() => {
      cy.task(
        'indexFleetEndpointPolicy',
        { policyName: 'tests-serverless' },
        { timeout: 5 * 60 * 1000 }
      ).then((res) => {
        const response = res as IndexedFleetEndpointPolicyResponse;
        loadedPolicyData = response;
      });
    });

    after(() => {
      if (loadedPolicyData) {
        cy.task('deleteIndexedFleetEndpointPolicies', loadedPolicyData);
      }
    });

    for (const endpointPolicyManagementPrivilege of PRIVILEGES) {
      describe(`endpoint policy management privilege is ${endpointPolicyManagementPrivilege}`, () => {
        for (const fleetPrivilege of PRIVILEGES) {
          for (const integrationsPrivilege of PRIVILEGES) {
            const shouldShowOnboardingSteps =
              (fleetPrivilege === 'all' && integrationsPrivilege === 'read') ||
              (fleetPrivilege === 'all' && integrationsPrivilege === 'all');

            it(`should ${
              shouldShowOnboardingSteps ? '' : ' NOT '
            } show onboarding steps with fleet:${fleetPrivilege} and integrations:${integrationsPrivilege}`, () => {
              loginWithCustomRole({
                endpointPolicyManagementPrivilege,
                fleetPrivilege,
                integrationsPrivilege,
              });

              loadPage(APP_ENDPOINTS_PATH);

              if (shouldShowOnboardingSteps) {
                cy.getByTestSubj('emptyHostsTable').should('exist');
                cy.getByTestSubj('onboardingSteps').should('exist');
              } else {
                // without correct privileges, fall back to empty policy table note showing that Fleet privilege is required
                cy.getByTestSubj('emptyPolicyTable').should('exist');
                cy.getByTestSubj('onboardingStartButton').should('not.exist');
              }
            });
          }
        }
      });
    }
  });

  describe('some hosts are enrolled', () => {
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
              loginWithCustomRole({
                endpointPolicyManagementPrivilege,
                fleetPrivilege,
                integrationsPrivilege,
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
});
