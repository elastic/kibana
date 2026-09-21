/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FULL_KIBANA_SECURITY_ROLE } from '@kbn/scout-security';
import { spaceTest, expect, tags } from '../fixtures';

const INTERNAL_HEADERS = {
  'x-elastic-internal-origin': 'alertzero',
  'elastic-api-version': '1',
};

spaceTest.describe(
  'AlertZero onboarding derived states',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // Start from a clean, disabled state for the space.
      await scoutSpace.uiSettings.set({ 'alertzero:enabled': false });
    });
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(FULL_KIBANA_SECURITY_ROLE);
    });
    spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
      // Disable uninstalls watch workflows and flips the setting back.
      await scoutSpace.uiSettings.set({ 'alertzero:enabled': false });
      await kbnClient.request({
        method: 'DELETE',
        path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
        headers: INTERNAL_HEADERS,
      });
    });
    spaceTest('S0: CTA page renders while disabled', async ({ page }) => {
      await page.gotoApp('alertzero');
      await expect(page.testSubj.locator('alertZeroOnboardingDisabledPage')).toBeVisible();
      await expect(page.testSubj.locator('alertZeroOnboardingEnableToggle')).toBeVisible();
    });
    spaceTest(
      'enable flips the setting, installs watch workflows, and confirms with a toast',
      async ({ page, kbnClient, scoutSpace }) => {
        // Click the REAL UI enable toggle — the path the enable-body bug lived in (the
        // API-only version of this test passed in CI while the button 400'd for a real user).
        await page.gotoApp('alertzero');
        await expect(page.testSubj.locator('alertZeroOnboardingDisabledPage')).toBeVisible();
        await page.testSubj.click('alertZeroOnboardingEnableToggle');

        // S2 is no longer a full-page prompt: the gate passes awaiting-first-run
        // and active straight through to the app root (conversations), with the
        // confirmation carried by a transient global toast. Assert the toast first —
        // it auto-dismisses after a few seconds, unlike the stable page below it.
        await expect(page.getByText('AlertZero is enabled', { exact: true })).toBeVisible();
        await expect(page.testSubj.locator('alertZeroPageHeader')).toBeVisible();
        await expect(page.testSubj.locator('alertZeroOnboardingAwaitingRunPage')).not.toBeVisible();

        // Real install path evidence: managed watch workflows now exist in this space.
        const workers = await kbnClient.request({
          method: 'GET',
          path: `/s/${scoutSpace.id}/internal/alertzero/workers`,
          headers: INTERNAL_HEADERS,
        });
        expect(workers.status).toBe(200);
        const body = workers.data as { workers?: unknown[] } | unknown[];
        const workersList = Array.isArray(body) ? body : body.workers ?? [];
        expect(workersList.length).toBeGreaterThan(0);
      }
    );
    spaceTest(
      'S2: after enable the app lands on the real surface, not an onboarding prompt',
      async ({ page, kbnClient, scoutSpace }) => {
        // Self-contained: enable in this space first (idempotent) so the assertion
        // does not depend on a previous test's side effect surviving a retry or a
        // fresh beforeAll reset.
        await kbnClient.request({
          method: 'POST',
          path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
          headers: INTERNAL_HEADERS,
          body: {},
        });
        await page.gotoApp('alertzero');
        // The gate opens onto the app root (conversations) — its page header renders,
        // and no onboarding prompt is in the way.
        await expect(page.testSubj.locator('alertZeroPageHeader')).toBeVisible();
        await expect(page.testSubj.locator('alertZeroOnboardingAwaitingRunPage')).not.toBeVisible();
        await expect(page.testSubj.locator('alertZeroOnboardingDisabledPage')).not.toBeVisible();
      }
    );
    spaceTest(
      'disable removes the installed watch workflows and lands back on the S0 CTA',
      async ({ page, kbnClient, scoutSpace }) => {
        // Enable first so there is something to remove; the route is idempotent.
        await kbnClient.request({
          method: 'POST',
          path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
          headers: INTERNAL_HEADERS,
          body: {},
        });
        const deleted = await kbnClient.request({
          method: 'DELETE',
          path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
          headers: INTERNAL_HEADERS,
        });
        expect(deleted.status).toBe(200);
        // Real uninstall evidence: enable installs the watch workflows with
        // workflowIdSuffix=spaceId, and disable must name the same suffixed
        // instances — an uninstall without the suffix removes nothing and the
        // workers keep running in a space whose UI says disabled.
        const workers = await kbnClient.request({
          method: 'GET',
          path: `/s/${scoutSpace.id}/internal/alertzero/workers`,
          headers: INTERNAL_HEADERS,
        });
        expect(workers.status).toBe(200);
        const body = workers.data as { workers?: unknown[] } | unknown[];
        const workersList = Array.isArray(body) ? body : body.workers ?? [];
        expect(workersList).toHaveLength(0);
        // The setting source of truth reads false again, so the gate is back on S0.
        await page.gotoApp('alertzero');
        await expect(page.testSubj.locator('alertZeroOnboardingDisabledPage')).toBeVisible();
      }
    );
  }
);
