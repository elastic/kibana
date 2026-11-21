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
  'Frustration signals',
  'Frustrated sessions',
  'Rage clicks',
  'Dead clicks',
  'Error clicks',
  'Signals over time',
  'Signals by app version',
  'Signals by browser',
  'Signals by device',
  'Error clicks by exception',
];

test.describe('Digital Experience frustration dashboard', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  test('opens from the Overview with the dashboard panels and the frustrated elements', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
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

    const { frustration } = testData.OTEL_SHOP_USAGE;
    for (const [title, count] of [
      ['Frustration signals', frustration.total],
      ['Rage clicks', frustration.rageClicks],
      ['Dead clicks', frustration.deadClicks],
      ['Error clicks', frustration.errorClicks],
    ] as const) {
      // The count panels have no label, so the value is the metric's only text.
      await expect(digitalExperience.frustrationMetric(title)).toHaveText(String(count));
    }
    await expect(digitalExperience.frustrationDashboardErrors).toHaveCount(0);

    const [element] = testData.OTEL_SHOP_USAGE.frustratedElements;
    await expect(digitalExperience.frustrationRow(element.cssSelector)).toContainText(
      element.cssSelector
    );
  });
});
