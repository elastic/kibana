/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the Elastic License 2.0 (ELv2)
 * or the Server Side Public License (SSPL v1), whichever you elect, as your
 * license, in accordance with the terms of such license, and you may not use
 * this file except in compliance with such license.
 */
import { spaceTest, expect, tags } from '../fixtures';
import { ALERTZERO_APP_PATH } from '@kbn/alertzero-common';

/**
 * AlertZero onboarding derived-state e2e. Runs against a real stack with
 * `alertzero.enabled: true` in kibana.yml and `alertzero.ui.useMockData: false`
 * — the enable test must exercise the REAL managed-workflow install path.
 */
spaceTest.describe(
  'AlertZero onboarding derived states',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      // Start from a clean, disabled state for the space.
      await scoutSpace.uiSettings.set({ 'alertzero:enabled': false });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      // Disable uninstalls watch workflows and flips the setting back.
      await scoutSpace.uiSettings.set({ 'alertzero:enabled': false });
      await scoutSpace.request.delete('/internal/alertzero/onboarding/enable');
    });

    spaceTest('S0: CTA page renders while disabled', async ({ page }) => {
      await page.goto(ALERTZERO_APP_PATH);
      await expect(page.getByTestSubject('alertZeroDisabledCtaPage')).toBeVisible();
      await expect(page.getByTestSubject('alertZeroEnableCta')).toBeVisible();
    });

    spaceTest('enable flips the setting and installs watch workflows', async ({ page, scoutSpace }) => {
      const response = await scoutSpace.request.post('/internal/alertzero/onboarding/enable');
      expect(response.ok()).toBeTruthy();
      // Real install path evidence: managed watch workflows now exist in this space.
      const workers = await scoutSpace.request.get('/internal/alertzero/workers');
      expect(workers.ok()).toBeTruthy();
      const body = await workers.json();
      const workersList = Array.isArray(body) ? body : body.workers;
      expect(workersList.length).toBeGreaterThan(0);
      // UI transitions out of S0.
      await page.goto(ALERTZERO_APP_PATH);
      await expect(
        page
          .getByTestSubject('alertZeroNoWatchesPage')
          .or(page.getByTestSubject('alertZeroAwaitingFirstRunPage'))
      ).toBeVisible();
    });

    spaceTest('S2: empty state renders while awaiting first run', async ({ page }) => {
      await page.goto(ALERTZERO_APP_PATH);
      await expect(
        page
          .getByTestSubject('alertZeroAwaitingFirstRunPage')
          .or(page.getByTestSubject('alertZeroNoWatchesPage'))
      ).toBeVisible();
    });
  }
);
