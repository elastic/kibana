/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ENDPOINTS_PATH } from '../../../../../common/constants';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';
import type { SiemVersion } from '../../common/constants';

const VERSIONS_TO_TEST: readonly SiemVersion[] = ['siemV3', 'siemV4'];

describe(
  'Endpoints page RBAC - neither Defend policy nor hosts are present (siem v3/v4)',
  { tags: ['@ess'] },
  () => {
    const PRIVILEGES = ['none', 'read', 'all'] as const;

    for (const siemVersion of VERSIONS_TO_TEST) {
      describe(siemVersion, () => {
        for (const endpointPolicyManagementPrivilege of PRIVILEGES) {
          describe(`endpoint policy management privilege is ${endpointPolicyManagementPrivilege}`, () => {
            for (const fleetPrivilege of PRIVILEGES) {
              for (const integrationsPrivilege of PRIVILEGES) {
                const shouldAllowOnboarding =
                  fleetPrivilege === 'all' && integrationsPrivilege === 'all';

                it(`should show onboarding screen ${
                  shouldAllowOnboarding ? 'with' : 'without'
                } 'Add Elastic Defend' button with fleet:${fleetPrivilege} and integrations:${integrationsPrivilege}`, () => {
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
    }
  }
);
