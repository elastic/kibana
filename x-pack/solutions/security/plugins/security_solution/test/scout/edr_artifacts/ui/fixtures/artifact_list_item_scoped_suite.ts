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
import { getArtifactRole } from './roles';

const STATEFUL_ONLY_REASON =
  'There is no serverless role that can read artifacts without write privilege';

/**
 * Administration list-page RBAC for one artifact type whose agnostic list is
 * shared with other spec files. Item-scoped variant of
 * `describeArtifactListPage`: it never calls `deleteList` / `createList`,
 * so it cannot delete items another worker is asserting on.
 *
 * What changes versus the shared-list suite:
 * - every item gets a unique name and assertions target that card;
 * - create starts from the header add button on a populated list. It keeps
 *   the form's default global assignment: the spec file that calls this
 *   suite is the only one with blocklist policy-tab assertions, its tests
 *   run serially on one worker, and the item is deleted before the next
 *   test starts;
 * - the READ empty-state assertion becomes "no add button in either state",
 *   because the list may hold items from another spec file;
 * - `endpointArtifactItems` deletes only what the test created.
 *
 * The list must already exist: items cannot be created through the API
 * before that, and `global.setup.ts` creates it once so workers do not race
 * the create POST.
 */
export const describeArtifactListPageItemScoped = (artifact: ArtifactTabCase): void => {
  const { pagePrefix, listId, entries, osTypes } = artifact;
  const editedDescription = 'Edited description';

  spaceTest.describe(
    `Artifact list page — ${artifact.title}`,
    { tag: ARTIFACT_LIST_PAGE_TAGS },
    () => {
      spaceTest(
        `T1 analyst sees no privileges on the list page`,
        async ({ browserAuth, pageObjects }) => {
          // T1 is Security-read with no artifact sub-privilege. If it ever
          // gained one, waitForNoPrivileges / noPrivilegesPage would fail.
          await browserAuth.loginAsT1Analyst();

          await pageObjects.artifactListPage.goto(artifact.urlPath);
          await pageObjects.artifactListPage.waitForNoPrivileges();

          await expect(pageObjects.artifactListPage.noPrivilegesPage).toBeVisible();
          await expect(pageObjects.artifactListPage.emptyPageFeatureAction).toBeVisible();
          await expect(pageObjects.artifactListPage.emptyState(pagePrefix)).toHaveCount(0);
          await expect(pageObjects.artifactListPage.emptyStateAddButton(pagePrefix)).toHaveCount(0);
        }
      );

      spaceTest(
        `READ user sees the list page without add`,
        async ({ browserAuth, pageObjects, config }) => {
          spaceTest.skip(Boolean(config.serverless), STATEFUL_ONLY_REASON);

          await browserAuth.loginWithCustomRole(getArtifactRole(artifact.privilegePrefix, 'read'));
          await pageObjects.artifactListPage.goto(artifact.urlPath);
          // `-container` wraps both the empty state and the list, so this holds
          // whether or not another spec file has items on the list.
          await pageObjects.artifactListPage.waitForList(pagePrefix);

          await expect(pageObjects.artifactListPage.emptyStateAddButton(pagePrefix)).toHaveCount(0);
          await expect(pageObjects.artifactListPage.pageAddButton(pagePrefix)).toHaveCount(0);
        }
      );

      spaceTest(
        `READ user can view artifacts but cannot add, edit, or delete`,
        async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy, config }) => {
          spaceTest.skip(Boolean(config.serverless), STATEFUL_ONLY_REASON);

          const name = await endpointArtifactItems.create({
            listId,
            name: artifact.artifactName,
            entries,
            osTypes,
            policyId: endpointPolicy.id,
          });

          await browserAuth.loginWithCustomRole(getArtifactRole(artifact.privilegePrefix, 'read'));
          await pageObjects.artifactListPage.goto(artifact.urlPath);
          await pageObjects.artifactListPage.waitForList(pagePrefix);

          await expect(pageObjects.artifactListPage.cardByName(pagePrefix, name)).toBeVisible();
          await expect(pageObjects.artifactListPage.pageAddButton(pagePrefix)).toHaveCount(0);
          await expect(
            pageObjects.artifactListPage.cardActionsButtonByName(pagePrefix, name)
          ).toHaveCount(0);
          await expect(pageObjects.artifactListPage.cardEditAction(pagePrefix)).toHaveCount(0);
          await expect(pageObjects.artifactListPage.cardDeleteAction(pagePrefix)).toHaveCount(0);
        }
      );

      spaceTest(
        `WRITE user can create, update, and delete`,
        async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy }) => {
          // Create + edit + delete after a role login. Precautionary, not
          // measured flake; the shorter policy-tab ALL path uses 90s.
          spaceTest.setTimeout(120_000);

          // The header add button only renders on a populated list.
          await endpointArtifactItems.create({
            listId,
            name: `${artifact.artifactName} seed`,
            entries,
            osTypes,
            policyId: endpointPolicy.id,
          });
          const name = endpointArtifactItems.uniqueName(listId, artifact.artifactName);
          const editedName = `${name} edited`;
          endpointArtifactItems.trackName(listId, editedName);

          await browserAuth.loginAsEndpointPolicyManager();
          await pageObjects.artifactListPage.goto(artifact.urlPath);
          await pageObjects.artifactListPage.waitForList(pagePrefix);

          await spaceTest.step('create from the page add button', async () => {
            await pageObjects.artifactListPage.openCreateFromPage(pagePrefix);
            await pageObjects.policyArtifactsPage.fillCreateForm(artifact.kind, name);
            await pageObjects.artifactListPage.submitFlyout(pagePrefix);

            const card = pageObjects.artifactListPage.cardByName(pagePrefix, name);
            await expect(card).toBeVisible();
            await expect(card.getByTestId(artifact.createCriteria.selector)).toHaveText(
              artifact.createCriteria.value
            );
            await pageObjects.toasts.dismissAll();
          });

          await spaceTest.step('update name and description', async () => {
            await pageObjects.artifactListPage.openEditByName(pagePrefix, name);
            await pageObjects.policyArtifactsPage.fillNameAndDescription(
              artifact.kind,
              editedName,
              editedDescription
            );
            await pageObjects.artifactListPage.submitFlyout(pagePrefix);

            const card = pageObjects.artifactListPage.cardByName(pagePrefix, editedName);
            await expect(card).toBeVisible();
            await expect(card.getByTestId(`${pagePrefix}-card-description`)).toHaveText(
              editedDescription
            );
            await pageObjects.toasts.dismissAll();
          });

          await spaceTest.step('delete the artifact', async () => {
            await pageObjects.artifactListPage.deleteArtifactByName(pagePrefix, editedName);
            await expect(
              pageObjects.artifactListPage.cardByName(pagePrefix, editedName)
            ).toHaveCount(0);
          });
        }
      );
    }
  );
};
