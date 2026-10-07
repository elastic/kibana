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

const ITEM_NAME = 'Endpoint exception name';
const FIRST_FIELD = 'agent.version';
/** Create or edit fills three comboboxes and submits. Same budget as list-page CRUD. */
const OR_FLOW_TIMEOUT_MS = 120_000;

const OR_CONDITIONS = [
  { field: 'agent.type', value: 'endpoint', cardText: 'AND agent.typeIS endpoint' },
  { field: 'process.name', value: 'notepad.exe', cardText: 'AND process.nameIS notepad.exe' },
] as const;

const CARD_CONDITIONS = [
  'AND agent.versionIS 1234',
  ...OR_CONDITIONS.map((condition) => condition.cardText),
];

/**
 * OR on the endpoint exceptions form saves one artifact per condition group.
 * Request counts for that split live in `use_artifact_update_or_create.test.ts`.
 * These tests stay in the endpoint exceptions spec: they mutate the same
 * agnostic list as the policy-tab suite.
 *
 * Tags are `ARTIFACT_LIST_PAGE_TAGS`, not the local-only default. This suite
 * does not call the per-policy opt-in route, which is why the list-page
 * factory keeps endpoint exceptions on `ARTIFACT_LIST_PAGE_LOCAL_TAGS`. Do not
 * copy these tags into a suite that opts in.
 */
export const describeEndpointExceptionOrOperator = (artifact: ArtifactTabCase): void => {
  const { pagePrefix, listId, listType, urlPath, osTypes } = artifact;
  const condition = `${pagePrefix}-card-criteriaConditions-condition`;

  spaceTest.describe('Endpoint exception OR operator', { tag: ARTIFACT_LIST_PAGE_TAGS }, () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteList(listId);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsEndpointPolicyManager();
    });

    spaceTest.afterEach(async ({ apiServices }) => {
      await apiServices.endpointArtifacts.deleteList(listId);
    });

    spaceTest('creates one endpoint exception per OR group', async ({ pageObjects }) => {
      spaceTest.setTimeout(OR_FLOW_TIMEOUT_MS);

      await pageObjects.artifactListPage.goto(urlPath);
      await pageObjects.artifactListPage.waitForEmpty(pagePrefix);
      await pageObjects.artifactListPage.openCreateFromEmpty(pagePrefix);
      await pageObjects.policyArtifactsPage.fillCreateForm('endpointExceptions');
      await pageObjects.policyArtifactsPage.addEndpointExceptionOrConditions(OR_CONDITIONS);
      await pageObjects.artifactListPage.submitFlyout(pagePrefix);
      await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });
      await pageObjects.toasts.dismissAll();

      await expect(
        pageObjects.artifactListPage.cardTitle(pagePrefix).filter({ hasText: ITEM_NAME })
      ).toHaveCount(CARD_CONDITIONS.length);
      for (const cardText of CARD_CONDITIONS) {
        await expect(
          pageObjects.artifactListPage.criteria(condition).filter({ hasText: cardText })
        ).toHaveText(cardText);
      }
    });

    spaceTest(
      'splits an edited endpoint exception into one artifact per OR group',
      async ({ pageObjects, apiServices }) => {
        spaceTest.setTimeout(OR_FLOW_TIMEOUT_MS);

        await apiServices.endpointArtifacts.createList({ listId, type: listType });
        await apiServices.endpointArtifacts.createItem({
          name: ITEM_NAME,
          listId,
          osTypes: [...osTypes],
          policyId: 'all',
          entries: [
            {
              field: FIRST_FIELD,
              operator: 'included',
              type: 'match',
              value: '1234',
            },
          ],
        });

        await pageObjects.artifactListPage.goto(urlPath);
        await pageObjects.artifactListPage.waitForList(pagePrefix);
        await expect(pageObjects.artifactListPage.card(pagePrefix)).toHaveCount(1);

        await pageObjects.artifactListPage.openEdit(pagePrefix);
        await pageObjects.policyArtifactsPage.addEndpointExceptionOrConditions(OR_CONDITIONS);
        await pageObjects.artifactListPage.submitFlyout(pagePrefix);
        await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });
        await pageObjects.toasts.dismissAll();

        await expect(
          pageObjects.artifactListPage.cardTitle(pagePrefix).filter({ hasText: ITEM_NAME })
        ).toHaveCount(CARD_CONDITIONS.length);
        for (const cardText of CARD_CONDITIONS) {
          await expect(
            pageObjects.artifactListPage.criteria(condition).filter({ hasText: cardText })
          ).toHaveText(cardText);
        }
      }
    );
  });
};
