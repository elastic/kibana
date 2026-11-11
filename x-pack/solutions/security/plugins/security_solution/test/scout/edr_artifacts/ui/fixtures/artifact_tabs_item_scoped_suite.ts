/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest } from '.';
import { ARTIFACT_TAB_POLICY_DETAILS_TAGS } from './artifact_tabs_suite';
import type { ArtifactTabCase } from './artifact_tabs_test_data';
import { getArtifactRole } from './roles';

const STATEFUL_ONLY_REASON =
  'There is no serverless role that can read a policy without the matching artifact privilege';

/**
 * Policy Details artifact tab RBAC for one artifact type whose agnostic list
 * is shared with other spec files. Item-scoped variant of
 * `describeArtifactTabPolicyDetails`: it never calls `deleteList` /
 * `createList`, so it cannot delete items another worker is asserting on.
 *
 * The "unexisting" tab state (no item on the whole list) cannot be
 * guaranteed while another spec file creates items, so those steps start
 * from the "unassigned" state instead.
 *
 * Precondition: the list holds no global (`policy:all`) item while this suite
 * runs. The policy tab lists global items as assigned to every policy
 * (`policy_artifacts_layout.tsx` queries `[policyId, 'all']`), so one
 * leftover global item breaks every "unassigned" and `toHaveCount(1)`
 * assertion here. The shared-list suite wiped the list first; this one
 * cannot. Spec files that run on another worker at the same time create
 * per-policy items only, and the global item the list-page suite creates in
 * the same file is deleted before the next test starts.
 *
 * The list must already exist: items cannot be created through the API
 * before that, and `global.setup.ts` creates it once so workers do not race
 * the create POST.
 */
export const describeArtifactTabPolicyDetailsItemScoped = (artifact: ArtifactTabCase): void => {
  const { listId, entries, osTypes } = artifact;

  spaceTest.describe(
    `Artifact tabs in Policy Details page — ${artifact.title}`,
    { tag: ARTIFACT_TAB_POLICY_DETAILS_TAGS },
    () => {
      spaceTest(
        `Tab is hidden when the user has no artifact privilege`,
        async ({ browserAuth, pageObjects, endpointPolicy, config }) => {
          spaceTest.skip(Boolean(config.serverless), STATEFUL_ONLY_REASON);

          await browserAuth.loginWithCustomRole(getArtifactRole(artifact.privilegePrefix, 'none'));
          await pageObjects.policyDetailsPage.goto(endpointPolicy.id);

          await expect(pageObjects.policyDetailsPage.artifactTab(artifact.tabTestSubj)).toHaveCount(
            0
          );
        }
      );

      spaceTest(
        `READ user can view artifacts but cannot assign or remove`,
        async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy, config }) => {
          spaceTest.skip(Boolean(config.serverless), STATEFUL_ONLY_REASON);
          // One login plus a policy-details reload; default 60s is tight.
          spaceTest.setTimeout(90_000);

          const openTab = async () => {
            await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
          };

          await spaceTest.step('cannot manage or assign unassigned artifacts', async () => {
            await endpointArtifactItems.create({
              listId,
              name: artifact.artifactName,
              entries,
              osTypes,
            });
            await browserAuth.loginWithCustomRole(
              getArtifactRole(artifact.privilegePrefix, 'read')
            );
            await pageObjects.policyDetailsPage.goto(endpointPolicy.id);
            await openTab();
            await pageObjects.policyArtifactsPage.waitForEmptyUnassigned();
            await expect(pageObjects.policyArtifactsPage.unassignedManageButton).toHaveCount(0);
            await expect(pageObjects.policyArtifactsPage.unassignedAssignButton).toHaveCount(0);
          });

          await spaceTest.step(
            'can see assigned artifacts but cannot assign or remove',
            async () => {
              const assignedName = await endpointArtifactItems.create({
                listId,
                name: artifact.artifactName,
                entries,
                osTypes,
                policyId: endpointPolicy.id,
              });
              await pageObjects.policyDetailsPage.reload();
              await openTab();
              await pageObjects.policyArtifactsPage.waitForAssignedList();

              await expect(pageObjects.policyArtifactsPage.artifactCard).toHaveCount(1);
              await expect(pageObjects.policyArtifactsPage.artifactCardTitle).toContainText(
                assignedName
              );
              await expect(pageObjects.policyArtifactsPage.assignButton).toHaveCount(0);

              await pageObjects.policyArtifactsPage.openCardActions();
              await expect(pageObjects.policyArtifactsPage.viewFullDetailsAction).toBeVisible();
              await expect(pageObjects.policyArtifactsPage.removeFromPolicyAction).toHaveCount(0);
            }
          );
        }
      );

      spaceTest(
        `ALL user can add an artifact from the policy tab`,
        async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy }) => {
          spaceTest.setTimeout(90_000);

          // An unassigned item puts the tab in the "unassigned" state, whose
          // manage button leads to the list page with the policy back link.
          await endpointArtifactItems.create({
            listId,
            name: `${artifact.artifactName} seed`,
            entries,
            osTypes,
          });
          const name = endpointArtifactItems.uniqueName(listId, artifact.artifactName);

          await browserAuth.loginAsEndpointPolicyManager();
          await pageObjects.policyDetailsPage.goto(endpointPolicy.id);
          await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
          await pageObjects.policyArtifactsPage.waitForEmptyUnassigned();

          await spaceTest.step('create a per-policy artifact from the manage page', async () => {
            await pageObjects.policyArtifactsPage.openManageFromUnassigned();
            await pageObjects.artifactListPage.waitForList(artifact.pagePrefix);
            await pageObjects.artifactListPage.openCreateFromPage(artifact.pagePrefix);
            await pageObjects.policyArtifactsPage.fillCreateForm(artifact.kind, name);
            await pageObjects.policyArtifactsPage.selectPerPolicyAssignment();
            await pageObjects.policyArtifactsPage.submitCreateForm(artifact.pagePrefix);

            const card = pageObjects.artifactListPage.cardByName(artifact.pagePrefix, name);
            await expect(card).toBeVisible();
            await expect(card.getByTestId(artifact.createCriteria.selector)).toHaveText(
              artifact.createCriteria.value
            );
          });

          await spaceTest.step(
            'back link returns to policy details and the next tab is reachable',
            async () => {
              await expect(pageObjects.policyDetailsPage.pageContainer).toHaveCount(0);
              // The back button is icon-only (tooltip/aria-label only, no visible text).
              await expect(pageObjects.policyDetailsPage.backToOrigin).toHaveAccessibleName(
                `Back to ${endpointPolicy.name} policy`
              );
              await pageObjects.policyDetailsPage.clickBackToOrigin();
              await pageObjects.policyDetailsPage.openArtifactTab(artifact.nextTabTestSubj);
              await pageObjects.policyDetailsPage.waitForPolicyDetailsVisible();
            }
          );
        }
      );

      spaceTest(
        `ALL user can manage and assign unassigned artifacts`,
        async ({ browserAuth, page, pageObjects, endpointArtifactItems, endpointPolicy }) => {
          const name = await endpointArtifactItems.create({
            listId,
            name: artifact.artifactName,
            entries,
            osTypes,
          });
          await browserAuth.loginAsEndpointPolicyManager();
          await pageObjects.policyDetailsPage.goto(endpointPolicy.id);
          await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
          await pageObjects.policyArtifactsPage.waitForEmptyUnassigned();

          await spaceTest.step('manage artifacts and return to the policy tab', async () => {
            await pageObjects.policyArtifactsPage.openManageFromUnassigned();
            await expect(page).toHaveURL(
              new RegExp(`/app/security/administration/${artifact.urlPath}(?:\\?|#|$)`)
            );
            await pageObjects.policyDetailsPage.clickBackToOrigin();
          });

          await spaceTest.step('assign the unassigned artifact to the policy', async () => {
            await pageObjects.policyArtifactsPage.openAssignFromUnassigned();
            await expect(pageObjects.policyArtifactsPage.assignConfirmButton).toBeDisabled();
            await pageObjects.policyArtifactsPage.assignArtifact(name);
            // Each type uses a different sentence; the quoted name is shared.
            // Scope to the toast list so this cannot match the assigned card.
            await pageObjects.toasts.waitForToastWithText(`"${name}"`);
            await pageObjects.policyArtifactsPage.waitForAssignedList();
            await expect(pageObjects.policyArtifactsPage.artifactCard).toHaveCount(1);
          });
        }
      );

      spaceTest(
        `ALL user can assign and remove artifacts from the policy`,
        async ({ browserAuth, pageObjects, endpointArtifactItems, endpointPolicy }) => {
          const name = await endpointArtifactItems.create({
            listId,
            name: artifact.artifactName,
            entries,
            osTypes,
            policyId: endpointPolicy.id,
          });
          await browserAuth.loginAsEndpointPolicyManager();
          await pageObjects.policyDetailsPage.goto(endpointPolicy.id);
          await pageObjects.policyDetailsPage.openArtifactTab(artifact.tabTestSubj);
          await pageObjects.policyArtifactsPage.waitForAssignedList();

          await expect(pageObjects.policyArtifactsPage.artifactCard).toHaveCount(1);
          await expect(pageObjects.policyArtifactsPage.artifactCardTitle).toContainText(name);

          await spaceTest.step('assign flyout opens from the assigned list', async () => {
            await pageObjects.policyArtifactsPage.openAssignFlyout();
            await pageObjects.policyArtifactsPage.cancelAssignFlyout();
          });

          await spaceTest.step('remove the artifact from the policy', async () => {
            await pageObjects.policyArtifactsPage.removeAssignedArtifactFromPolicy();
            await pageObjects.toasts.waitForToastWithText('Successfully removed');
          });
        }
      );
    }
  );
};
