/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  ALERTZERO_ONLY_ROLE,
  ESCALATIONS_ROLE,
  createUiOnboardingSpace,
  seedInvestigation,
  spaceTest,
  tags,
  withSecuritySolution,
} from '../fixtures';

const TEST_TIMEOUT_MS = 240_000;
const UI_TIMEOUT_MS = 90_000;
const SPACE_NAMESPACE = 'scout-perm';
const PRIVILEGES_PATH = '/internal/investigations/_privileges';

interface PrivilegesBody {
  escalations: { read: boolean; manage: boolean };
}

/**
 * AlertZero All grants no escalation privileges, so the AlertZero-only role has neither the API
 * privileges nor the UI capability. Only the AlertZero-only flyout test guards that: it fails if
 * AlertZero All regains them, via the `/internal/investigations/_privileges` fallback in
 * `useCanManageEscalations`. The controls hold the UI capability and skip that fallback, and the
 * card-menu tests read the UI capability only.
 */
spaceTest.describe(
  'AlertZero permissions - investigation escalation actions',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(TEST_TIMEOUT_MS);

    spaceTest(
      'AlertZero only: the investigation flyout hides Open an escalation (escalation API privilege)',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices, esClient }) => {
        const space = await createUiOnboardingSpace(
          kbnClient,
          withSecuritySolution(kbnClient, apiServices.spaces),
          { namespace: SPACE_NAMESPACE }
        );
        let seeded: Awaited<ReturnType<typeof seedInvestigation>> | undefined;
        try {
          seeded = await seedInvestigation(space.api, space.spaceId, {
            esClient,
            origin: 'alertzero',
            title: 'Permission spec flyout alertzero',
          });

          await browserAuth.loginWithCustomRole(ALERTZERO_ONLY_ROLE);
          // Registered before navigation: the probe is requested as the flyout mounts.
          const privilegesResponse = page.waitForResponse(
            (response) => response.url().includes(PRIVILEGES_PATH),
            { timeout: UI_TIMEOUT_MS }
          );
          await page.goto(
            kbnUrl.app('alertzero', {
              space: space.spaceId,
              pathOptions: { params: { selectedConversationId: seeded.conversationId } },
            })
          );

          const alertZero = pageObjects.alertZeroApp;
          // Same footer as the escalation button: proves it rendered before the absence is asserted.
          await expect(alertZero.investigationFlyoutOpenChat).toBeVisible({
            timeout: UI_TIMEOUT_MS,
          });
          const response = await privilegesResponse;
          expect(response.status()).toBe(200);
          const { escalations } = (await response.json()) as PrivilegesBody;
          expect(escalations.manage).toBe(false);
          await expect(alertZero.openEscalationButton).toHaveCount(0);
        } finally {
          try {
            if (seeded) await seeded.cleanup();
          } finally {
            await space.cleanup();
          }
        }
      }
    );

    spaceTest(
      'Manage escalations (control): the investigation flyout shows Open an escalation',
      async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices, esClient }) => {
        const space = await createUiOnboardingSpace(
          kbnClient,
          withSecuritySolution(kbnClient, apiServices.spaces),
          { namespace: SPACE_NAMESPACE }
        );
        let seeded: Awaited<ReturnType<typeof seedInvestigation>> | undefined;
        try {
          seeded = await seedInvestigation(space.api, space.spaceId, {
            esClient,
            origin: 'alertzero',
            title: 'Permission spec flyout escalate',
          });

          await browserAuth.loginWithCustomRole(ESCALATIONS_ROLE);
          await page.goto(
            kbnUrl.app('alertzero', {
              space: space.spaceId,
              pathOptions: { params: { selectedConversationId: seeded.conversationId } },
            })
          );

          const alertZero = pageObjects.alertZeroApp;
          await expect(alertZero.investigationFlyoutOpenChat).toBeVisible({
            timeout: UI_TIMEOUT_MS,
          });
          await expect(alertZero.openEscalationButton).toBeVisible({ timeout: UI_TIMEOUT_MS });
        } finally {
          try {
            if (seeded) await seeded.cleanup();
          } finally {
            await space.cleanup();
          }
        }
      }
    );

    const menuCases = [
      {
        title: 'AlertZero only: the card menu hides escalation items (UI capability)',
        role: ALERTZERO_ONLY_ROLE,
        seedTitle: 'Permission spec card actions alertzero',
        expectedCount: 0,
      },
      {
        title: 'Manage escalations (control): the card menu shows escalation items (UI capability)',
        role: ESCALATIONS_ROLE,
        seedTitle: 'Permission spec card actions escalate',
        expectedCount: 1,
      },
    ] as const;

    for (const { title, role, seedTitle, expectedCount } of menuCases) {
      spaceTest(
        title,
        async ({ page, pageObjects, browserAuth, kbnUrl, kbnClient, apiServices, esClient }) => {
          const space = await createUiOnboardingSpace(
            kbnClient,
            withSecuritySolution(kbnClient, apiServices.spaces),
            { namespace: SPACE_NAMESPACE }
          );
          let seeded: Awaited<ReturnType<typeof seedInvestigation>> | undefined;
          try {
            seeded = await seedInvestigation(space.api, space.spaceId, {
              esClient,
              origin: 'alertzero',
              title: seedTitle,
            });

            await browserAuth.loginWithCustomRole(role);
            await page.goto(kbnUrl.app('alertzero', { space: space.spaceId }));

            const alertZero = pageObjects.alertZeroApp;
            await expect(alertZero.proposalRow(seeded.title)).toBeVisible({
              timeout: UI_TIMEOUT_MS,
            });
            await alertZero.actionsMenuButton(seeded.title).click();

            // Every role gets "Copy link": proves the menu opened before the absence is asserted.
            await expect(alertZero.actionsMenuItem('Copy link')).toBeVisible();
            await expect(alertZero.actionsMenuItem('Open an escalation')).toHaveCount(
              expectedCount
            );
            await expect(alertZero.actionsMenuItem('Attach to an escalation')).toHaveCount(
              expectedCount
            );
          } finally {
            try {
              if (seeded) await seeded.cleanup();
            } finally {
              await space.cleanup();
            }
          }
        }
      );
    }
  }
);
