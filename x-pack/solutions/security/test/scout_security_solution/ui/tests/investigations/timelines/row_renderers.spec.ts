/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { deleteTimelines } from '../../../common/timeline_api_helpers';
import { SECURITY_ARCHIVES, loadEsArchive, unloadEsArchive } from '../../../common/es_helpers';
import { HOSTS_ALL_URL } from '../../../common/urls';

test.describe(
  'Timelines - Row renderers',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await loadEsArchive(esArchiver, SECURITY_ARCHIVES.BULK_PROCESS);
    });

    test.afterAll(async ({ esArchiver }) => {
      await unloadEsArchive(esArchiver, SECURITY_ARCHIVES.BULK_PROCESS);
    });

    test.beforeEach(async ({ kbnClient, browserAuth }) => {
      await deleteTimelines(kbnClient);
      await browserAuth.loginAsAdmin();
    });

    test('Row renderers should be disabled by default', async ({ page, pageObjects }) => {
      await page.goto(HOSTS_ALL_URL);
      await pageObjects.timeline.openTimelineUsingToggle();
      await pageObjects.timeline.executeTimelineKQL('host.name: *');

      await test.step('Open row renderers modal and verify disabled', async () => {
        const gearBtn = page.testSubj.locator('show-row-renderers-gear');
        await gearBtn.click();

        const checkboxes = page.testSubj.locator('row-renderers-modal-item-checkbox');
        await expect(checkboxes).toBeVisible({ timeout: 10_000 });

        const checkbox = page.testSubj
          .locator('row-renderers-modal-item-checkbox')
          .locator('input');
        await expect(checkbox).not.toBeChecked();
      });
    });
  }
);
