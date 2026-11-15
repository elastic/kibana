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
 * form -> real create route -> card condition. Stays in the blocklists spec
 * file because it mutates the same agnostic `endpoint_blocklists` list.
 */
export const describeBlocklistMatchOperator = (artifact: ArtifactTabCase): void => {
  const { pagePrefix, listId, urlPath } = artifact;
  const condition = `${pagePrefix}-card-criteriaConditions-condition`;

  spaceTest.describe(
    'Blocklist Match (wildcard) operator',
    { tag: ARTIFACT_LIST_PAGE_TAGS },
    () => {
      spaceTest.beforeAll(async ({ apiServices }) => {
        await apiServices.endpointArtifacts.deleteList(listId);
      });

      spaceTest.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsEndpointPolicyManager();
      });

      spaceTest.afterEach(async ({ apiServices }) => {
        await apiServices.endpointArtifacts.deleteList(listId);
      });

      for (const { title, field, value, expectedCondition } of MATCH_CASES) {
        spaceTest(
          `creates a blocklist item with the Match operator for the ${title} field`,
          async ({ pageObjects }) => {
            spaceTest.setTimeout(90_000);
            await pageObjects.artifactListPage.goto(urlPath);
            await pageObjects.artifactListPage.waitForEmpty(pagePrefix);
            await pageObjects.artifactListPage.openCreateFromEmpty(pagePrefix);
            await pageObjects.policyArtifactsPage.fillBlocklistMatchCreateForm({
              name: ITEM_NAME,
              description: 'Test Description',
              field,
              value,
            });
            await pageObjects.artifactListPage.submitFlyout(pagePrefix);
            await pageObjects.toasts.waitForToastWithText(
              `"${ITEM_NAME}" has been added to your blocklist.`
            );
            await pageObjects.artifactListPage.flyout(pagePrefix).waitFor({ state: 'hidden' });

            await expect(pageObjects.artifactListPage.cardTitle(pagePrefix)).toContainText(
              ITEM_NAME
            );
            await expect(pageObjects.artifactListPage.criteria(condition)).toHaveText(
              expectedCondition
            );
          }
        );
      }
    }
  );
};
