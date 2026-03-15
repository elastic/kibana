/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';
import { createRule, deleteAlertsAndRules } from '../../../common/api_helpers';
import { ALERTS_URL, HOSTS_ALL_URL } from '../../../common/urls';

const alertRuntimeField = `field.alert.${Date.now()}`;
const timelineRuntimeField = `field.timeline.${Date.now()}`;

test.describe(
  'Create DataView runtime field',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test('adds field to alert table', async ({ browserAuth, apiServices, page, pageObjects }) => {
      test.slow();
      await deleteAlertsAndRules(apiServices);
      await createRule(apiServices, { name: `Rule ${Date.now()}` });
      await browserAuth.loginAsAdmin();
      await page.goto(ALERTS_URL);

      const fieldBrowser = page.getByTestId('show-field-browser').first();
      await fieldBrowser.waitFor({ state: 'visible', timeout: 15_000 });
      await fieldBrowser.click();

      const createFieldBtn = page.getByTestId('createField');
      await createFieldBtn.click();
      await page.getByTestId('fieldNameInput').fill(alertRuntimeField);
      await page.getByTestId('saveField').click();

      await expect(page.getByTestId(`dataGridHeaderCell-${alertRuntimeField}`).first()).toBeVisible(
        { timeout: 10_000 }
      );
    });

    test('adds field to timeline', async ({ browserAuth, page, pageObjects }) => {
      test.slow();
      await browserAuth.loginAsAdmin();
      await page.goto(HOSTS_ALL_URL);
      await pageObjects.timeline.openTimelineUsingToggle();

      const searchInput = page.locator('[data-test-subj="timelineQueryInput"]').first();
      await searchInput.fill('host.name: *');
      await searchInput.press('Enter');

      const addFieldBtn = page.getByTestId('timeline-discover-fields-button').first();
      await addFieldBtn.waitFor({ state: 'visible', timeout: 10_000 });
      await addFieldBtn.click();
      await page.getByTestId('fieldNameInput').fill(timelineRuntimeField);
      await page.getByTestId('saveField').click();

      await expect(page.getByTestId('saveField').first()).not.toBeVisible({ timeout: 5000 });
    });
  }
);
