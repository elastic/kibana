/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, type BlocklistMatchField } from '.';
import { ARTIFACT_LIST_PAGE_TAGS } from './artifact_list_suite';
import type { ArtifactTabCase } from './artifact_tabs_test_data';

const ITEM_NAME = 'Test Blocklist';

const MATCH_CASES: ReadonlyArray<{
  title: string;
  field: BlocklistMatchField;
  value: string;
  expectedCondition: RegExp;
}> = [
  {
    title: 'Path',
    field: 'file.path.caseless',
    value: 'C:\\foo\\*.exe',
    expectedCondition: /AND\s*file\.path\.caseless\s*MATCHES\s*C:\\foo\\\*\.exe/i,
  },
  {
    // The flyout defaults to Windows (case-insensitive), so Match stores File
    // Name as `file.name.caseless`.
    title: 'File Name',
    field: 'file.name',
    value: '*.exe',
    expectedCondition: /AND\s*file\.name\.caseless\s*MATCHES\s*\*\.exe/i,
  },
];

/**
 * Match (wildcard) operator create flow for the Path and File Name fields:
 * form -> real create route -> card condition.
 *
 * The agnostic `endpoint_blocklists` list is shared with the other blocklist
 * spec files and is not space-isolated, so this suite never wipes it: every
 * item gets a unique name, is created per-policy (never global, so it cannot
 * show up on another worker's policy tab), and `endpointArtifactItems`
 * deletes only the items this test created.
 */
export const describeBlocklistMatchOperator = (artifact: ArtifactTabCase): void => {
  const { pagePrefix, listId, urlPath, entries, osTypes } = artifact;
  const condition = `${pagePrefix}-card-criteriaConditions-condition`;

  spaceTest.describe(
    'Blocklist Match (wildcard) operator',
    { tag: ARTIFACT_LIST_PAGE_TAGS },
    () => {
      spaceTest.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsEndpointPolicyManager();
      });

      for (const { title, field, value, expectedCondition } of MATCH_CASES) {
        spaceTest(
          `creates a blocklist item with the Match operator for the ${title} field`,
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
            await pageObjects.policyArtifactsPage.fillBlocklistMatchCreateForm({
              name,
              description: 'Test Description',
              field,
              value,
            });
            await pageObjects.policyArtifactsPage.selectPerPolicyAssignment();
            await pageObjects.artifactListPage.submitFlyout(pagePrefix);
            await pageObjects.toasts.waitForToastWithText(
              `"${name}" has been added to your blocklist.`
            );
            await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

            const card = pageObjects.artifactListPage.cardByName(pagePrefix, name);
            await expect(card).toBeVisible();
            await expect(card.getByTestId(condition)).toHaveText(expectedCondition);
          }
        );
      }
    }
  );
};
