/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, ROLE } from '../tasks/login';
import { loadPage } from '../tasks/common';

import { type ArtifactsFixtureType } from '../fixtures/artifacts_page';
import {
  createArtifactList,
  createPerPolicyArtifact,
  enableEndpointExceptionPerPolicyOptIn,
  removeAllArtifacts,
} from '../tasks/artifacts';
import { performUserActions } from '../tasks/perform_user_actions';
import { indexEndpointHosts } from '../tasks/index_endpoint_hosts';
import type { ReturnTypeFromChainable } from '../types';
import { SIEM_VERSIONS } from '../common/constants';
import type { SiemVersion } from '../common/constants';
import { SECURITY_FEATURE_ID } from '../../../../common';

/**
 * Notes:
 * ESS:
 *  - testing WRITE privileges with custom roles
 *  - also, all SIEM feature versions are tested to check backward compatibility
 *
 * Serverless: a subset of tests.
 *  - WRITE privileges are tested with predefined roles
 *  - and only the latest SIEM feature (SECURITY_FEATURE_ID)
 *
 * Possible improvement: use custom roles on serverless to test the same as on ESS.
 */
export const getArtifactMockedDataTests = (testData: ArtifactsFixtureType) => () => {
  let endpointData: ReturnTypeFromChainable<typeof indexEndpointHosts> | undefined;

  const isServerless = Cypress.env('IS_SERVERLESS');
  const firstSiemVersion = testData.firstSiemVersion ?? 'siem';
  const siemVersionsToTest = isServerless
    ? [SECURITY_FEATURE_ID]
    : SIEM_VERSIONS.filter(
        (version) => getVersionNumber(version) >= getVersionNumber(firstSiemVersion)
      );

  let loginWithWriteAccess: () => void;

  before(() => {
    indexEndpointHosts().then((indexEndpoints) => {
      endpointData = indexEndpoints;
    });

    enableEndpointExceptionPerPolicyOptIn();
  });

  beforeEach(() => {
    removeAllArtifacts();
  });

  after(() => {
    removeAllArtifacts();

    endpointData?.cleanup();
    endpointData = undefined;
  });

  for (const siemVersion of siemVersionsToTest) {
    describe(siemVersion, () => {
      describe(`When on the ${testData.title} entries list`, () => {
        beforeEach(() => {
          const { privilegePrefix } = testData;

          loginWithWriteAccess = () => {
            if (isServerless) {
              login(ROLE.endpoint_policy_manager);
            } else {
              login.withCustomKibanaPrivileges({
                [siemVersion]: ['read', `${privilegePrefix}all`],
              });
            }
          };
        });

        describe('given there are no artifacts yet', () => {
          it(`write - should create new ${testData.title} entry`, () => {
            loginWithWriteAccess();
            loadPage(`/app/security/administration/${testData.urlPath}`);
            // Opens add flyout
            cy.getByTestSubj(`${testData.pagePrefix}-emptyState-addButton`).click();

            performUserActions(testData.create.formActions);

            // Submit create artifact form
            cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

            // Check new artifact is in the list
            for (const checkResult of testData.create.checkResults) {
              cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
            }
          });
        });

        describe('given there is an existing artifact', () => {
          beforeEach(() => {
            createArtifactList(testData.createRequestBody.list_id);
            createPerPolicyArtifact(testData.artifactName, testData.createRequestBody);
          });

          it(`write - should be able to update an existing ${testData.title} entry`, () => {
            loginWithWriteAccess();
            loadPage(`/app/security/administration/${testData.urlPath}`);
            // Opens edit flyout
            cy.getByTestSubj(`${testData.pagePrefix}-card-header-actions-button`).click();
            cy.getByTestSubj(`${testData.pagePrefix}-card-cardEditAction`).click();

            performUserActions(testData.update.formActions);

            // Submit edit artifact form
            cy.getByTestSubj(`${testData.pagePrefix}-flyout-submitButton`).click();

            for (const checkResult of testData.update.checkResults) {
              cy.getByTestSubj(checkResult.selector).should('have.text', checkResult.value);
            }
          });

          it(`write - should be able to delete the existing ${testData.title} entry`, () => {
            loginWithWriteAccess();
            loadPage(`/app/security/administration/${testData.urlPath}`);
            // Remove it
            cy.getByTestSubj(`${testData.pagePrefix}-card-header-actions-button`).click();
            cy.getByTestSubj(`${testData.pagePrefix}-card-cardDeleteAction`).click();
            cy.getByTestSubj(`${testData.pagePrefix}-deleteModal-submitButton`).click();
            // No card visible after removing it
            cy.getByTestSubj(testData.delete.card).should('not.exist');
            // Empty state is displayed after removing last item
            cy.getByTestSubj(testData.emptyState).should('exist');
          });
        });
      });
    });
  }
};

const getVersionNumber = (version: SiemVersion): number =>
  Number(version.replace(/siemV?/, '') || 1);
