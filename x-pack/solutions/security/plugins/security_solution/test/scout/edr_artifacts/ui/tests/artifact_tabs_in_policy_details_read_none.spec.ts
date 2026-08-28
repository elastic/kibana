/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
import { expect } from '@kbn/scout-security/ui';
import { test, tags } from '../fixtures';
import { ARTIFACT_TAB_CASES } from '../fixtures/artifact_tabs_test_data';
import { MOCK_ENDPOINT_POLICY_ID } from '../fixtures/constants';
import { mockEndpointPolicyFleetApis } from '../fixtures/mocks';
import { getArtifactNoneRole, getArtifactReadRole } from '../fixtures/roles';

/**
 * READ/NONE coverage is stateful-only: there is no serverless role that can
 * read a policy without the matching artifact privilege.
 */
test.describe(
  'Artifact tabs in Policy Details page — READ/NONE',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteAll([...ENDPOINT_ARTIFACT_LIST_IDS]);
      await apiServices.endpointArtifacts.optInEndpointExceptionsPerPolicy();
    });

    test.afterEach(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteAll([...ENDPOINT_ARTIFACT_LIST_IDS]);
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteAll([...ENDPOINT_ARTIFACT_LIST_IDS]);
    });

    for (const artifact of ARTIFACT_TAB_CASES) {
      test(`${artifact.title} tab is hidden when the user has no artifact privilege`, async ({
        browserAuth,
        page,
        pageObjects,
      }) => {
        await browserAuth.loginWithCustomRole(getArtifactNoneRole(artifact.privilegePrefix));
        await mockEndpointPolicyFleetApis(page);
        await pageObjects.policyDetailsPage.goto(MOCK_ENDPOINT_POLICY_ID);

        await expect(pageObjects.policyDetailsPage.artifactTab(artifact.tabTestSubj)).toHaveCount(
          0
        );
      });

      test(`${artifact.title} READ user cannot add an artifact from an empty tab`, async ({
        browserAuth,
        page,
        pageObjects,
        apiServices,
      }) => {
        await apiServices.endpointArtifacts.deleteList(artifact.listId);
        await browserAuth.loginWithCustomRole(getArtifactReadRole(artifact.privilegePrefix));
        await mockEndpointPolicyFleetApis(page);
        await pageObjects.policyDetailsPage.goto(MOCK_ENDPOINT_POLICY_ID);
        await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
        await pageObjects.policyArtifactsPage.waitForEmptyUnexisting();

        await expect(pageObjects.policyArtifactsPage.unexistingManageButton).toHaveCount(0);
        await expect(pageObjects.policyArtifactsPage.unexistingImportButton).toHaveCount(0);
      });

      test(`${artifact.title} READ user cannot manage or assign unassigned artifacts`, async ({
        browserAuth,
        page,
        pageObjects,
        apiServices,
      }) => {
        await apiServices.endpointArtifacts.createList({
          listId: artifact.listId,
          type: artifact.listType,
        });
        await apiServices.endpointArtifacts.createItem({
          name: artifact.artifactName,
          listId: artifact.listId,
          entries: artifact.entries,
          osTypes: artifact.osTypes,
        });
        await browserAuth.loginWithCustomRole(getArtifactReadRole(artifact.privilegePrefix));
        await mockEndpointPolicyFleetApis(page);
        await pageObjects.policyDetailsPage.goto(MOCK_ENDPOINT_POLICY_ID);
        await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
        await pageObjects.policyArtifactsPage.waitForEmptyUnassigned();

        await expect(pageObjects.policyArtifactsPage.unassignedManageButton).toHaveCount(0);
        await expect(pageObjects.policyArtifactsPage.unassignedAssignButton).toHaveCount(0);
      });

      test(`${artifact.title} READ user can see assigned artifacts but cannot assign or remove`, async ({
        browserAuth,
        page,
        pageObjects,
        apiServices,
      }) => {
        await apiServices.endpointArtifacts.createList({
          listId: artifact.listId,
          type: artifact.listType,
        });
        await apiServices.endpointArtifacts.createItem({
          name: artifact.artifactName,
          listId: artifact.listId,
          entries: artifact.entries,
          osTypes: artifact.osTypes,
          policyId: MOCK_ENDPOINT_POLICY_ID,
        });
        await browserAuth.loginWithCustomRole(getArtifactReadRole(artifact.privilegePrefix));
        await mockEndpointPolicyFleetApis(page);
        await pageObjects.policyDetailsPage.goto(MOCK_ENDPOINT_POLICY_ID);
        await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
        await pageObjects.policyArtifactsPage.waitForAssignedList();

        await expect(pageObjects.policyArtifactsPage.artifactCard).toHaveCount(1);
        await expect(pageObjects.policyArtifactsPage.artifactCardTitle).toContainText(
          artifact.artifactName
        );
        await expect(pageObjects.policyArtifactsPage.assignButton).toHaveCount(0);

        await pageObjects.policyArtifactsPage.openCardActions();
        await expect(pageObjects.policyArtifactsPage.removeFromPolicyAction).toHaveCount(0);
      });
    }
  }
);
