/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0 (ELv2)
 * or the Server Side Public License (SSPL v1), whichever you elect as
 * appropriate, in accordance with such license.
 */
import { spaceTest, expect, tags } from "../fixtures";
import { FULL_KIBANA_SECURITY_ROLE } from "@kbn/scout-security";

/** Internal-origin + API-version headers required by AlertZero internal routes. */
const INTERNAL_HEADERS = {
  "x-elastic-internal-origin": "alertzero",
  "elastic-api-version": "1",
};

spaceTest.describe(
  "AlertZero onboarding derived states",
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // Start from a clean, disabled state for the space.
      await scoutSpace.uiSettings.set({ "alertzero:enabled": false });
    });
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginWithCustomRole(FULL_KIBANA_SECURITY_ROLE);
    });
    spaceTest.afterAll(async ({ kbnClient, scoutSpace }) => {
      // Disable uninstalls watch workflows and flips the setting back.
      await scoutSpace.uiSettings.set({ "alertzero:enabled": false });
      await kbnClient.request({
        method: "DELETE",
        path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
        headers: INTERNAL_HEADERS,
      });
    });
    spaceTest("S0: CTA page renders while disabled", async ({ page }) => {
      await page.gotoApp("alertzero");
      await expect(page.testSubj.locator("alertZeroOnboardingDisabledPage")).toBeVisible();
      await expect(page.testSubj.locator("alertZeroOnboardingEnableToggle")).toBeVisible();
    });
    spaceTest(
      "enable flips the setting and installs watch workflows",
      async ({ page, kbnClient, scoutSpace }) => {
        const response = await kbnClient.request({
          method: "POST",
          path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
          headers: INTERNAL_HEADERS,
          body: {},
        });
        expect(response.status).toBe(200);
        // Real install path evidence: managed watch workflows now exist in this space.
        const workers = await kbnClient.request({
          method: "GET",
          path: `/s/${scoutSpace.id}/internal/alertzero/workers`,
          headers: INTERNAL_HEADERS,
        });
        expect(workers.status).toBe(200);
        const body = workers.data;
        const workersList = Array.isArray(body) ? body : body.workers;
        expect(workersList.length).toBeGreaterThan(0);
        // UI transitions out of S0.
        await page.gotoApp("alertzero");
        await expect(
          page
            .testSubj.locator("alertZeroOnboardingNoWatchesPage")
            .or(page.testSubj.locator("alertZeroOnboardingAwaitingRunPage"))
        ).toBeVisible();
      }
    );
    spaceTest(
      "S2: empty state renders while awaiting first run",
      async ({ page, kbnClient, scoutSpace }) => {
        // Self-contained: enable in this space first (idempotent) so the assertion
        // does not depend on a previous test's side effect surviving a retry or a
        // fresh beforeAll reset.
        await kbnClient.request({
          method: "POST",
          path: `/s/${scoutSpace.id}/internal/alertzero/onboarding/enable`,
          headers: INTERNAL_HEADERS,
          body: {},
        });
        await page.gotoApp("alertzero");
        await expect(
          page
            .testSubj.locator("alertZeroOnboardingAwaitingRunPage")
            .or(page.testSubj.locator("alertZeroOnboardingNoWatchesPage"))
        ).toBeVisible();
      }
    );
  }
);
