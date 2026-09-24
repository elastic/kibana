/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest } from '.';
import { ARTIFACT_LIST_PAGE_TAGS } from './artifact_list_suite';
import type { ArtifactTabCase } from './artifact_tabs_test_data';

const ITEM_NAME = 'Test Blocklist';
const ITEM_DESCRIPTION = 'Test Description';
const SIGNATURE_MATCH_VALUE = 'Elastic, Inc.';
const SIGNATURE_MATCH_ANY_VALUES = ['Elastic', 'Inc.'];

const IS_EXPECTED_CONDITION = /AND\s*file.Ext.code_signature\s*IS\s*Elastic,\s*Inc\./i;
const IS_ONE_OF_EXPECTED_CONDITION =
  /AND\s*file.Ext.code_signature\s*is\s*one\s*of\s*Elastic\s*Inc\./i;

const signatureEntries = (type: 'match' | 'match_any') => [
  {
    entries: [
      {
        field: 'subject_name',
        value: type === 'match' ? SIGNATURE_MATCH_VALUE : SIGNATURE_MATCH_ANY_VALUES,
        type,
        operator: 'included',
      },
    ],
    field: 'file.Ext.code_signature',
    type: 'nested',
  },
];

/**
 * Windows-signature operator CRUD. Hash create/update/delete already lives in
 * `describeArtifactListPage`. These tests stay in the blocklists spec file
 * because they mutate the same agnostic `endpoint_blocklists` list.
 */
export const describeBlocklistOperatorField = (artifact: ArtifactTabCase): void => {
  const { pagePrefix, listId, listType, urlPath } = artifact;
  const condition = `${pagePrefix}-card-criteriaConditions-condition`;

  spaceTest.describe('Blocklist signature operator field', { tag: ARTIFACT_LIST_PAGE_TAGS }, () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteList(listId);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsEndpointPolicyManager();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteList(listId);
    });

    spaceTest('creates a blocklist item with the is operator', async ({ pageObjects }) => {
      spaceTest.setTimeout(90_000);
      await pageObjects.artifactListPage.goto(urlPath);
      await pageObjects.artifactListPage.waitForEmpty(pagePrefix);
      await pageObjects.artifactListPage.openCreateFromEmpty(pagePrefix);
      await pageObjects.policyArtifactsPage.fillBlocklistSignatureCreateForm({
        name: ITEM_NAME,
        description: ITEM_DESCRIPTION,
        operator: 'is',
        value: SIGNATURE_MATCH_VALUE,
      });
      await pageObjects.artifactListPage.submitFlyout(pagePrefix);
      await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

      await expect(pageObjects.artifactListPage.cardTitle(pagePrefix)).toContainText(ITEM_NAME);
      await expect(pageObjects.artifactListPage.criteria(condition)).toHaveText(
        IS_EXPECTED_CONDITION
      );
    });

    spaceTest('creates a blocklist item with the is one of operator', async ({ pageObjects }) => {
      spaceTest.setTimeout(90_000);
      await pageObjects.artifactListPage.goto(urlPath);
      await pageObjects.artifactListPage.waitForEmpty(pagePrefix);
      await pageObjects.artifactListPage.openCreateFromEmpty(pagePrefix);
      await pageObjects.policyArtifactsPage.fillBlocklistSignatureCreateForm({
        name: ITEM_NAME,
        description: ITEM_DESCRIPTION,
        operator: 'is one of',
        value: SIGNATURE_MATCH_ANY_VALUES,
      });
      await pageObjects.artifactListPage.submitFlyout(pagePrefix);
      await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

      await expect(pageObjects.artifactListPage.cardTitle(pagePrefix)).toContainText(ITEM_NAME);
      await expect(pageObjects.artifactListPage.criteria(condition)).toHaveText(
        IS_ONE_OF_EXPECTED_CONDITION
      );
    });

    spaceTest('updates a match_any signature item to is', async ({ pageObjects, apiServices }) => {
      spaceTest.setTimeout(90_000);
      await apiServices.endpointArtifacts.createList({ listId, type: listType });
      await apiServices.endpointArtifacts.createItem({
        name: ITEM_NAME,
        listId,
        entries: signatureEntries('match_any'),
        osTypes: ['windows'],
      });

      await pageObjects.artifactListPage.goto(urlPath);
      await pageObjects.artifactListPage.waitForList(pagePrefix);
      await pageObjects.artifactListPage.openEdit(pagePrefix);
      await pageObjects.policyArtifactsPage.selectBlocklistOperator('is');
      await pageObjects.artifactListPage.submitFlyout(pagePrefix);
      await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

      await expect(pageObjects.artifactListPage.criteria(condition)).toHaveText(
        IS_EXPECTED_CONDITION
      );
    });

    spaceTest(
      'updates a match signature item to is one of',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(90_000);
        await apiServices.endpointArtifacts.createList({ listId, type: listType });
        await apiServices.endpointArtifacts.createItem({
          name: ITEM_NAME,
          listId,
          entries: signatureEntries('match'),
          osTypes: ['windows'],
        });

        await pageObjects.artifactListPage.goto(urlPath);
        await pageObjects.artifactListPage.waitForList(pagePrefix);
        await pageObjects.artifactListPage.openEdit(pagePrefix);
        await pageObjects.policyArtifactsPage.selectBlocklistOperator('is one of');
        await pageObjects.artifactListPage.submitFlyout(pagePrefix);
        await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

        await expect(pageObjects.artifactListPage.criteria(condition)).toHaveText(
          IS_ONE_OF_EXPECTED_CONDITION
        );
      }
    );
  });
};
