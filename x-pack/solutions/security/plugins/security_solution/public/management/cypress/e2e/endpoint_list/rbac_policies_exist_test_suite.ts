/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import type { SiemVersion } from '../../common/constants';

export const createRbacPoliciesExistSuite = (siemVersion: SiemVersion) => {
  const PRIVILEGES = ['none', 'read', 'all'] as const;

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

            if (shouldShowOnboardingSteps) {
              cy.getByTestSubj('emptyHostsTable').should('exist');
              cy.getByTestSubj('onboardingSteps').should('exist');
            } else {
              cy.getByTestSubj('emptyPolicyTable').should('exist');
              cy.getByTestSubj('onboardingStartButton').should('not.exist');
            }
          });
        }
      }
    });
  }
};
