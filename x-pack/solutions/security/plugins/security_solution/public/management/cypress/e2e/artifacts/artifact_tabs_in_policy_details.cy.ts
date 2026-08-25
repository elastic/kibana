/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getArtifactsListTestsData } from '../../fixtures/artifacts_page';
import { visitPolicyDetailsPage } from '../../screens/policy_details';
import {
  createArtifactList,
  createPerPolicyArtifact,
  removeAllArtifacts,
  removeExceptionsList,
  yieldFirstPolicyID,
} from '../../tasks/artifacts';
import { login, ROLE } from '../../tasks/login';
import { performUserActions } from '../../tasks/perform_user_actions';
import { indexEndpointHosts } from '../../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../../types';

const loginWithPrivilegeAll = () => {
  login(ROLE.endpoint_policy_manager);
};

const clickArtifactTab = (tabId: string) => {
  cy.get(`#${tabId}`).click();
};

describe(
  'Artifact tabs in Policy Details page',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'endpointExceptionsMovedUnderManagement',
          ])}`,
        ],
      },
    },
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;
    let policyId: string;

    const visitArtifactTab = (tabId: string) => {
      visitPolicyDetailsPage(policyId);
      clickArtifactTab(tabId);
    };

    before(() => {
      indexEndpointHosts().then((indexEndpoints) => {
        endpointData = indexEndpoints;
        policyId = indexEndpoints.data.integrationPolicies[0].id;
      });
    });

    after(() => {
      removeAllArtifacts();

      endpointData?.cleanup();
      endpointData = undefined;
    });

    for (const testData of getArtifactsListTestsData()) {
      describe(`${testData.title} tab`, () => {
        beforeEach(() => {
          login();
          removeExceptionsList(testData.createRequestBody.list_id);
        });

        context(`Given there are no ${testData.title} entries`, () => {
          it(`[ALL] User can add ${testData.title} artifact`, () => {
            loginWithPrivilegeAll();
            visitArtifactTab(testData.tabId);

            cy.getByTestSubj('policy-artifacts-empty-unexisting').should('exist');
            cy.getByTestSubj('unexisting-manage-artifacts-import-button').should('exist');

            cy.getByTestSubj('unexisting-manage-artifacts-button').should('exist').click();

            const { formActions, checkResults } = testData.create;

            performUserActions(formActions);

            // Add a per policy artifact - but not assign it to any policy
            cy.get('[data-test-subj$="-perPolicy"]').click(); // test-subjects are generated in different formats, but all ends with -perPolicy
            cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

            // Check new artifact is in the list
            for (const checkResult of checkResults) {
              cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
            }

            cy.getByTestSubj('policyDetailsPage').should('not.exist');
            cy.getByTestSubj('backToOrigin').contains(/^Back to .+ policy$/);

            cy.getByTestSubj('backToOrigin').click();
            cy.getByTestSubj('policyDetailsPage').should('exist');
            clickArtifactTab(testData.nextTabId); // Make sure the next tab is accessible and backLink doesn't throw errors
            cy.getByTestSubj('policyDetailsPage');
          });
        });

        context(`Given there are no assigned ${testData.title} entries`, () => {
          beforeEach(() => {
            login();
            createArtifactList(testData.createRequestBody.list_id);
            createPerPolicyArtifact(testData.artifactName, testData.createRequestBody);
          });

          it(`[ALL] User can Manage and Assign ${testData.title} artifacts`, () => {
            loginWithPrivilegeAll();
            visitArtifactTab(testData.tabId);

            cy.getByTestSubj('policy-artifacts-empty-unassigned').should('exist');

            // Manage artifacts
            cy.getByTestSubj('unassigned-manage-artifacts-button').should('exist').click();
            cy.location('pathname').should(
              'equal',
              `/app/security/administration/${testData.urlPath}`
            );
            cy.getByTestSubj('backToOrigin').click();

            // Assign artifacts
            cy.getByTestSubj('unassigned-assign-artifacts-button').should('exist').click();

            cy.getByTestSubj('artifacts-assign-flyout').should('exist');
            cy.getByTestSubj('artifacts-assign-confirm-button').should('be.disabled');

            cy.getByTestSubj(`${testData.artifactName}_checkbox`).click();
            cy.getByTestSubj('artifacts-assign-confirm-button').click();
          });
        });

        context(`Given there are assigned ${testData.title} entries`, () => {
          beforeEach(() => {
            login();
            createArtifactList(testData.createRequestBody.list_id);
            yieldFirstPolicyID().then((policyID) => {
              createPerPolicyArtifact(testData.artifactName, testData.createRequestBody, policyID);
            });
          });

          it(`[ALL] User can see ${testData.title} artifacts and can assign or remove artifacts from policy`, () => {
            loginWithPrivilegeAll();
            visitArtifactTab(testData.tabId);

            // List of artifacts
            cy.getByTestSubj('artifacts-collapsed-list-card').should('have.length', 1);
            cy.getByTestSubj('artifacts-collapsed-list-card-header-titleHolder').contains(
              testData.artifactName
            );

            // Assign artifacts
            cy.getByTestSubj('artifacts-assign-button').should('exist').click();
            cy.getByTestSubj('artifacts-assign-flyout').should('exist');
            cy.getByTestSubj('artifacts-assign-cancel-button').click();

            // Remove from policy
            cy.getByTestSubj('artifacts-collapsed-list-card-header-actions-button').click();
            cy.getByTestSubj('remove-from-policy-action').click();
            cy.getByTestSubj('confirmModalConfirmButton').click();

            cy.contains('Successfully removed');
          });
        });
      });
    }
  }
);
