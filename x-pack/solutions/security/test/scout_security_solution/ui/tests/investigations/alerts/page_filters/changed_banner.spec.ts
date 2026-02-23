/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { test, expect, tags } from '../../../../fixtures';
import { deleteAlertsAndRules, createRule } from '../../../../common/api_helpers';
import { ALERTS_URL } from '../../../../common/urls';

const customFilters = [
  { field_name: 'kibana.alert.workflow_status', title: 'Workflow Status' },
  { field_name: 'kibana.alert.severity', title: 'Severity' },
  { field_name: 'user.name', title: 'User Name' },
  { field_name: 'process.name', title: 'ProcessName' },
  { field_name: '@timestamp', title: '@timestamp' },
  { field_name: 'agent.type', title: 'AgentType' },
  { field_name: 'kibana.alert.rule.name', title: 'Rule Name' },
];

const buildPageFiltersParam = (filters: Array<{ field_name: string; title: string }>): string => {
  const formatted = filters.map((f) => ({
    title: f.title,
    fieldName: f.field_name,
    selectedOptions: [],
    existsSelected: false,
    exclude: false,
  }));
  return encode(formatted);
};

test.describe('Alerts page filters - changed banner', { tag: tags.deploymentAgnostic }, () => {
  test.beforeEach(async ({ browserAuth, page, apiServices }) => {
    await deleteAlertsAndRules(apiServices);
    await createRule(apiServices);
    await browserAuth.loginAsAdmin();
    await page.goto(ALERTS_URL);
    await page.testSubj.locator('expand-event').waitFor({ state: 'visible', timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await deleteAlertsAndRules(apiServices);
  });

  test('should populate custom filters and display the changed banner', async ({
    page,
    pageObjects,
  }) => {
    const pageFiltersParam = buildPageFiltersParam(customFilters);
    const currentUrl = new URL(page.url());
    currentUrl.searchParams.set('pageFilters', pageFiltersParam);
    await page.goto(currentUrl.toString());

    await pageObjects.alertFilters.waitForFiltersToLoad();
    await expect(pageObjects.alertFilters.changedBanner).toBeVisible();
  });

  test('should hide changed banner on saving changes', async ({ page, pageObjects }) => {
    const pageFiltersParam = buildPageFiltersParam(customFilters);
    const currentUrl = new URL(page.url());
    currentUrl.searchParams.set('pageFilters', pageFiltersParam);
    await page.goto(currentUrl.toString());

    await pageObjects.alertFilters.waitForFiltersToLoad();
    await expect(pageObjects.alertFilters.changedBanner).toBeVisible();

    await pageObjects.alertFilters.saveChanges();
    await expect(pageObjects.alertFilters.changedBanner).toBeHidden();
  });

  test('should hide changed banner on discarding changes', async ({ page, pageObjects }) => {
    const pageFiltersParam = buildPageFiltersParam(customFilters);
    const currentUrl = new URL(page.url());
    currentUrl.searchParams.set('pageFilters', pageFiltersParam);
    await page.goto(currentUrl.toString());

    await pageObjects.alertFilters.waitForFiltersToLoad();
    await expect(pageObjects.alertFilters.changedBanner).toBeVisible();

    await pageObjects.alertFilters.discardChanges();
    await expect(pageObjects.alertFilters.changedBanner).toBeHidden();
  });

  test('should hide changed banner on Reset', async ({ page, pageObjects }) => {
    const pageFiltersParam = buildPageFiltersParam(customFilters);
    const currentUrl = new URL(page.url());
    currentUrl.searchParams.set('pageFilters', pageFiltersParam);
    await page.goto(currentUrl.toString());

    await pageObjects.alertFilters.waitForFiltersToLoad();
    await expect(pageObjects.alertFilters.changedBanner).toBeVisible();

    await pageObjects.alertFilters.resetControls();
    await expect(pageObjects.alertFilters.changedBanner).toBeHidden();
  });
});
