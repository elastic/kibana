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

  test('should show an error when the alert does not exist', async ({ page, pageObjects }) => {
    await pageObjects.alertPage.goto('non-existent-alert-id');
    await expect(page.testSubj.locator('alertDetailsError')).toBeVisible();
  });

  test('should show a tabbed view', async ({ page, pageObjects }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await expect(page.testSubj.locator('overviewTab')).toBeVisible();
      await expect(page.testSubj.locator('metadataTab')).toBeVisible();
      await expect(page.testSubj.locator('investigationGuideTab')).toBeVisible();
      await expect(page.testSubj.locator('relatedAlertsTab')).toBeVisible();
      await expect(page.testSubj.locator('relatedDashboardsTab')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should show a Threshold Alert Overview section', async ({ page, pageObjects }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await expect(page.testSubj.locator('thresholdAlertOverviewSection')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should show an Alerts History section', async ({ page, pageObjects }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await expect(page.testSubj.locator('AlertDetails')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should show Metadata tab panel when Metadata tab is clicked', async ({
    page,
    pageObjects,
  }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await page.testSubj.locator('metadataTab').click();
      await expect(page.testSubj.locator('metadataTabPanel')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should show an empty prompt in the Investigation Guide tab when no guide is set', async ({
    page,
    pageObjects,
  }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await page.testSubj.locator('investigationGuideTab').click();
      await expect(page.testSubj.locator('alertInvestigationGuideEmptyPrompt')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should show a Related Alerts table when Related Alerts tab is clicked', async ({
    page,
    pageObjects,
  }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await page.testSubj.locator('relatedAlertsTab').click();
      await expect(page.testSubj.locator('relatedAlertsTable')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('should show a Related Dashboard component when Related Dashboards tab is clicked', async ({
    page,
    pageObjects,
  }) => {
    await expect(async () => {
      await pageObjects.alertPage.gotoAlertByRuleId(pageObjects.rulesPage, ruleId);
      await page.testSubj.locator('relatedDashboardsTab').click();
      await expect(page.testSubj.locator('alertRelatedDashboards')).toBeVisible();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });
});
