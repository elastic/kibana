/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import {
  ALERTS_ALL_ROLE,
  ALERTS_NONE_ROLE,
  attachAlerts,
  createUiOnboardingSpace,
  seedInvestigation,
  spaceTest,
  tags,
  withSecuritySolution,
} from '../fixtures';

const TEST_TIMEOUT_MS = 240_000;
const UI_TIMEOUT_MS = 90_000;
const SPACE_NAMESPACE = 'scout-perm';
const ALERT_IDS = ['permission-spec-alert-1', 'permission-spec-alert-2'];

/** Without the Alerts feature the link must land on "Privileges required", never Get started. */
spaceTest.describe(
  'AlertZero permissions - alerts attachment link',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.setTimeout(TEST_TIMEOUT_MS);

    const cases = [
      { label: 'Alerts feature absent', role: ALERTS_NONE_ROLE, hasAlerts: false },
      { label: 'Alerts All (control)', role: ALERTS_ALL_ROLE, hasAlerts: true },
    ] as const;

    for (const { label, role, hasAlerts } of cases) {
      spaceTest(
        `${label}: the alerts link opens ${hasAlerts ? 'the Alerts page' : 'Privileges required'}`,
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
              title: `Permission spec alerts link ${hasAlerts ? 'all' : 'none'}`,
            });
            await attachAlerts(space.api, space.spaceId, seeded.conversationId, ALERT_IDS);

            await browserAuth.loginWithCustomRole(role);
            await page.goto(
              kbnUrl.app('alertzero', {
                space: space.spaceId,
                pathOptions: { params: { selectedConversationId: seeded.conversationId } },
              })
            );

            const link = pageObjects.alertZeroApp.alertsLinkRow(ALERT_IDS.length);
            await expect(link).toBeVisible({ timeout: UI_TIMEOUT_MS });
            expect(await link.getAttribute('href')).toContain('/app/security/alerts');

            // The row opens a new tab: assert on the page the user actually gets.
            const [popup] = await Promise.all([page.waitForEvent('popup'), link.click()]);
            await expect(popup).toHaveURL(/\/app\/security\/alerts/, { timeout: UI_TIMEOUT_MS });
            await expect(pageObjects.alertZeroApp.alertsPageContent(popup)).toHaveCount(
              hasAlerts ? 1 : 0,
              { timeout: UI_TIMEOUT_MS }
            );
            await expect(pageObjects.alertZeroApp.noPrivilegesPage(popup)).toHaveCount(
              hasAlerts ? 0 : 1,
              { timeout: UI_TIMEOUT_MS }
            );
            expect(popup.url()).not.toContain('get_started');
            await popup.close();
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
