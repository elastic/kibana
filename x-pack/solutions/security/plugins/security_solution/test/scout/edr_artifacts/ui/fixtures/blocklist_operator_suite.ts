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
 * `describeArtifactListPageItemScoped`.
 *
 * The agnostic `endpoint_blocklists` list is shared with the other blocklist
 * spec files and is not space-isolated, so this suite never wipes it: every
 * item gets a unique name, is created per-policy (never global, so it cannot
 * show up on another worker's policy tab), and `endpointArtifactItems`
 * deletes only the items this test created.
 */
export const describeBlocklistOperatorField = (artifact: ArtifactTabCase): void => {
  const { pagePrefix, listId, urlPath, entries, osTypes } = artifact;
  const condition = `${pagePrefix}-card-criteriaConditions-condition`;

  spaceTest.describe('Blocklist signature operator field', { tag: ARTIFACT_LIST_PAGE_TAGS }, () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsEndpointPolicyManager();
    });

    spaceTest(
      'creates a blocklist item with the is operator',
      async ({ pageObjects, endpointArtifactItems, endpointPolicy }) => {
        spaceTest.setTimeout(90_000);
        // The header add button only renders on a populated list.
        await endpointArtifactItems.create({
          listId,
          name: `${ITEM_NAME} seed`,
          entries,
          osTypes,
          policyId: endpointPolicy.id,
        });
        const name = endpointArtifactItems.uniqueName(listId, ITEM_NAME);

        await pageObjects.artifactListPage.goto(urlPath);
        await pageObjects.artifactListPage.waitForList(pagePrefix);
        await pageObjects.artifactListPage.openCreateFromPage(pagePrefix);
        await pageObjects.policyArtifactsPage.fillBlocklistSignatureCreateForm({
          name,
          description: ITEM_DESCRIPTION,
          operator: 'is',
          value: SIGNATURE_MATCH_VALUE,
        });
        await pageObjects.policyArtifactsPage.selectPerPolicyAssignment();
        await pageObjects.artifactListPage.submitFlyout(pagePrefix);
        await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

        const card = pageObjects.artifactListPage.cardByName(pagePrefix, name);
        await expect(card).toBeVisible();
        await expect(card.getByTestId(condition)).toHaveText(IS_EXPECTED_CONDITION);
      }
    );

    spaceTest(
      'creates a blocklist item with the is one of operator',
      async ({ pageObjects, endpointArtifactItems, endpointPolicy }) => {
        spaceTest.setTimeout(90_000);
        await endpointArtifactItems.create({
          listId,
          name: `${ITEM_NAME} seed`,
          entries,
          osTypes,
          policyId: endpointPolicy.id,
        });
        const name = endpointArtifactItems.uniqueName(listId, ITEM_NAME);

        await pageObjects.artifactListPage.goto(urlPath);
        await pageObjects.artifactListPage.waitForList(pagePrefix);
        await pageObjects.artifactListPage.openCreateFromPage(pagePrefix);
        await pageObjects.policyArtifactsPage.fillBlocklistSignatureCreateForm({
          name,
          description: ITEM_DESCRIPTION,
          operator: 'is one of',
          value: SIGNATURE_MATCH_ANY_VALUES,
        });
        await pageObjects.policyArtifactsPage.selectPerPolicyAssignment();
        await pageObjects.artifactListPage.submitFlyout(pagePrefix);
        await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

        const card = pageObjects.artifactListPage.cardByName(pagePrefix, name);
        await expect(card).toBeVisible();
        await expect(card.getByTestId(condition)).toHaveText(IS_ONE_OF_EXPECTED_CONDITION);
      }
    );

    spaceTest(
      'updates a match_any signature item to is',
      async ({ pageObjects, endpointArtifactItems, endpointPolicy }) => {
        spaceTest.setTimeout(90_000);
        const name = await endpointArtifactItems.create({
          listId,
          name: ITEM_NAME,
          entries: signatureEntries('match_any'),
          osTypes: ['windows'],
          policyId: endpointPolicy.id,
        });

        await pageObjects.artifactListPage.goto(urlPath);
        await pageObjects.artifactListPage.waitForList(pagePrefix);
        await pageObjects.artifactListPage.openEditByName(pagePrefix, name);
        await pageObjects.policyArtifactsPage.selectBlocklistOperator('is');
        await pageObjects.artifactListPage.submitFlyout(pagePrefix);
        await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

        await expect(
          pageObjects.artifactListPage.cardByName(pagePrefix, name).getByTestId(condition)
        ).toHaveText(IS_EXPECTED_CONDITION);
      }
    );

    spaceTest(
      'updates a match signature item to is one of',
      async ({ pageObjects, endpointArtifactItems, endpointPolicy }) => {
        spaceTest.setTimeout(90_000);
        const name = await endpointArtifactItems.create({
          listId,
          name: ITEM_NAME,
          entries: signatureEntries('match'),
          osTypes: ['windows'],
          policyId: endpointPolicy.id,
        });

        await pageObjects.artifactListPage.goto(urlPath);
        await pageObjects.artifactListPage.waitForList(pagePrefix);
        await pageObjects.artifactListPage.openEditByName(pagePrefix, name);
        await pageObjects.policyArtifactsPage.selectBlocklistOperator('is one of');
        await pageObjects.artifactListPage.submitFlyout(pagePrefix);
        await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

        await expect(
          pageObjects.artifactListPage.cardByName(pagePrefix, name).getByTestId(condition)
        ).toHaveText(IS_ONE_OF_EXPECTED_CONDITION);
      }
    );
  });
};
