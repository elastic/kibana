/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import type { PolicyData } from '../../../../../common/endpoint/types';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { login } from '../../tasks/login';
import { loadPage } from '../../tasks/common';

describe(
  'Policy Details - Policy settings',
  {
    tags: [
      '@ess',
      '@serverless',
      // skipped on MKI since feature flags are not supported there
      '@skipInServerlessMKI',
    ],
  },
  () => {
    const loadSettingsUrl = (policyId: string) =>
      loadPage(`/app/security/administration/policy/${policyId}/settings`);

    describe('Policy settings', () => {
      describe('Renders policy settings form', () => {
        let indexedPolicy: IndexedFleetEndpointPolicyResponse;
        let policy: PolicyData;

        beforeEach(() => {
          login();
          getEndpointIntegrationVersion().then((version) => {
            createAgentPolicyTask(version).then((data) => {
              indexedPolicy = data;
              policy = indexedPolicy.integrationPolicies[0];
            });
          });
        });

        afterEach(() => {
          if (indexedPolicy) {
            cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
          }
        });
        it('should render disabled button and display modal if unsaved changes are present', () => {
          loadSettingsUrl(policy.id);
          cy.getByTestSubj('policyDetailsSaveButton').should('be.disabled');
          cy.getByTestSubj('endpointPolicyForm-malware-enableDisableSwitch').click();
          cy.getByTestSubj('policyDetailsSaveButton').should('not.be.disabled');
          cy.getByTestSubj('policyProtectionUpdatesTab').click();
          cy.getByTestSubj('policyDetailsUnsavedChangesModal').within(() => {
            cy.getByTestSubj('confirmModalCancelButton').click();
          });
          cy.url().should('include', 'settings');
          cy.getByTestSubj('policyProtectionUpdatesTab').click();

          cy.getByTestSubj('policyDetailsUnsavedChangesModal').within(() => {
            cy.getByTestSubj('confirmModalConfirmButton').click();
          });
          cy.url().should('include', 'protectionUpdates');
        });
      });
    });
  }
);
