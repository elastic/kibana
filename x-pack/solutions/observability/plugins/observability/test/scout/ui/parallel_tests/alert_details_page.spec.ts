/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../fixtures';
import { GENERATED_METRICS } from '../fixtures/constants';

test.describe('Alert Details Page', { tag: ['@ess', '@svlOblt'] }, () => {
  let ruleId: string;
  const alertName = `Write bytes test rule ${Date.now()}`;

  test.beforeAll(async ({ apiServices }) => {
    const createdRule = (await apiServices.alerting.rules.create({
      tags: [],
      params: {
        criteria: [
          {
            comparator: '>',
            metrics: [
              {
                name: 'A',
                field: GENERATED_METRICS.metricName,
                aggType: 'max',
              },
            ],
            threshold: [100],
            timeSize: 1,
            timeUnit: 'd',
          },
        ],
        alertOnNoData: false,
        alertOnGroupDisappear: false,
        searchConfiguration: {
          query: {
            query: '',
            language: 'kuery',
          },
          index: 'metrics-*',
        },
      },
      schedule: {
        interval: '1m',
      },
      consumer: 'alerts',
      name: alertName,
      ruleTypeId: 'observability.rules.custom_threshold',
      actions: [],
    })) as { data: { id: string } };
    ruleId = createdRule.data.id;
  });
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should show error when the alert does not exist', async ({ page, pageObjects }) => {
    await pageObjects.alertPage.goto('non-existent-alert-id');
    await expect(page.testSubj.locator('alertDetailsError')).toBeVisible();
  });

  test('should show tabbed view', async ({ page, pageObjects }) => {
    await expect(async () => {
      await pageObjects.rulesPage.goto(ruleId);

      await expect(page.testSubj.locator('ruleName')).toBeVisible();

      await page.testSubj.waitForSelector('expand-event');
      const expandAlertButtons = await page.testSubj.locator('expand-event').all();
      expect(expandAlertButtons.length).toBeGreaterThan(0);

      await expandAlertButtons[0].click();

      const alertDetailsLink = page.testSubj.locator('alertsFlyoutAlertDetailsButton');
      await expect(alertDetailsLink).toBeVisible();
      await alertDetailsLink.click();

      await expect(page.testSubj.locator('overviewTab')).toBeVisible();
      await expect(page.testSubj.locator('metadataTab')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });
});
