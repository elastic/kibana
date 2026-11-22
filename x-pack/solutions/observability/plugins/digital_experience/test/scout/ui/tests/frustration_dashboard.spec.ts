/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const DASHBOARD_PANELS = [
  'Signals per session',
  'Frustrated sessions',
  'Rage clicks per session',
  'Dead clicks per session',
  'Error clicks per session',
  'Signals over time',
  'Sessions by signals per session',
  'Top actions with frustration signals',
  'Avg rage clicks per page view',
  'Sessions with rage clicks',
  'Top actions with rage clicks',
  'Avg dead clicks per page view',
  'Sessions with dead clicks',
  'Top actions with dead clicks',
  'Avg error clicks per page view',
  'Sessions with error clicks',
  'Top actions with error clicks',
  'Error clicks by exception',
];

const BREAKDOWN_PANELS = [
  'Signals per session by app version',
  'Signals per session by browser',
  'Signals per session by device',
];

test.describe('Digital Experience frustration dashboard', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  test.afterAll(async ({ apiServices, kbnClient }) => {
    await kbnClient.savedObjects.clean({ types: ['dashboard'] });
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  test('opens from the Overview with the dashboard panels and the frustrated elements', async ({
    browserAuth,
    page,
    pageObjects: { digitalExperience },
  }) => {
    await browserAuth.loginAsViewer();
    await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
      ...testData.TIME_RANGE,
      source: 'otel',
    });

    await digitalExperience.frustrationDashboardLink.click();

    await expect(page).toHaveURL(new RegExp(`/${testData.OTEL_APPS.shop}/frustration`));
    await expect(page).toHaveURL(/rangeFrom=2021-01-18/);
    await expect(digitalExperience.frustrationPageTitle).toBeVisible();
    for (const title of DASHBOARD_PANELS) {
      await expect(digitalExperience.frustrationPanelHeading(title)).toBeVisible();
    }

    // All signals are of the one session with an id, so each per-session value is its count. The
    // data has no page view events, so no value per page view can be checked.
    const { frustration } = testData.OTEL_SHOP_USAGE;
    for (const [title, count] of [
      ['Signals per session', frustration.total],
      ['Rage clicks per session', frustration.rageClicks],
      ['Dead clicks per session', frustration.deadClicks],
      ['Error clicks per session', frustration.errorClicks],
    ] as const) {
      await expect(digitalExperience.frustrationMetric(title)).toContainText(count.toFixed(2));
    }

    const [element] = testData.OTEL_SHOP_USAGE.frustratedElements;
    const topActions = digitalExperience.frustrationPanel('Top actions with frustration signals');
    await expect(topActions).toContainText(element.cssSelector);
    await expect(topActions).toContainText(element.topPage);

    await digitalExperience.frustrationSectionToggle('frustration-breakdowns').click();
    for (const title of BREAKDOWN_PANELS) {
      await expect(digitalExperience.frustrationPanelHeading(title)).toBeVisible();
    }
    await expect(digitalExperience.frustrationDashboardErrors).toHaveCount(0);

    await expect(digitalExperience.frustrationRow(element.cssSelector)).toContainText(
      element.cssSelector
    );
    // A viewer can't save dashboards.
    await expect(digitalExperience.frustrationSaveAsDashboard).toHaveCount(0);
  });

  test('saves the panels as a dashboard and opens it', async ({
    browserAuth,
    page,
    pageObjects: { digitalExperience },
  }) => {
    await browserAuth.loginAsAdmin();
    await digitalExperience.gotoApplication(testData.OTEL_APPS.shop, {
      ...testData.TIME_RANGE,
      source: 'otel',
    });
    await digitalExperience.frustrationDashboardLink.click();
    await expect(digitalExperience.frustrationPanelHeading(DASHBOARD_PANELS[0])).toBeVisible();

    await digitalExperience.frustrationSaveAsDashboard.click();
    const title = page.getByTestId('savedObjectTitle');
    await expect(title).toHaveValue(`${testData.OTEL_APPS.shop} frustration signals`);
    await page.getByTestId('confirmSaveSavedObjectButton').click();

    await expect(page).toHaveURL(/\/app\/dashboards#\/view\//);
    await expect(page).toHaveTitle(new RegExp(`${testData.OTEL_APPS.shop} frustration signals`));
    for (const panelTitle of DASHBOARD_PANELS) {
      await expect(digitalExperience.savedDashboardPanelHeading(panelTitle)).toBeVisible();
    }
  });
});
