/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { BUSY_RELEASE, MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { TIME_RANGE } = testData;

test.describe('Digital Experience mobile applications', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  test('lists the mobile applications and opens the page of one', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await test.step('lists a row per application on the Mobile tab, with its platforms', async () => {
      // Picks the Web tab, whose tabs show even without web rows: EDOT Browser rows come from
      // sessions, which are never built for this range, and serverless has no Classic RUM data.
      await digitalExperience.gotoApplications({ ...TIME_RANGE, applicationType: 'web' });
      await digitalExperience.mobileTab.click();
      await expect(page).toHaveURL(/applicationType=mobile/);

      await expect(digitalExperience.mobileApplicationsTable.locator).toBeVisible();
      await expect(digitalExperience.applicationsTable.rows).toHaveCount(0);
      const row = digitalExperience.mobileApplicationRow(MOBILE_APPS.reactNative);
      await expect(row).toHaveCount(1);
      await expect(row.getByTestId('digitalExperiencePlatformBadge')).toHaveText([
        'Android',
        'iOS',
      ]);
    });

    await test.step('has no accessibility violations on the Mobile tab', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });

    await test.step('narrows the rows to the platform picked in the Platform filter', async () => {
      const androidOnly = digitalExperience.mobileApplicationLink(MOBILE_APPS.android);
      await expect(androidOnly).toBeVisible();

      await digitalExperience.selectPlatform('iOS');

      await expect(page).toHaveURL(/platformFilter=ios/);
      await expect(digitalExperience.mobileApplicationLink(MOBILE_APPS.reactNative)).toBeVisible();
      await expect(androidOnly).toBeHidden();
    });

    await test.step('opens the mobile page, which keeps its EDOT source and type on reload', async () => {
      await digitalExperience.mobileApplicationLink(MOBILE_APPS.reactNative).click();

      await expect(page).toHaveURL(/applicationType=mobile/);
      await expect(page).toHaveURL(/source=otel/);
      await expect(digitalExperience.mobileKpis).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(/applicationType=mobile/);
      await expect(digitalExperience.mobileKpis).toBeVisible();
    });

    await test.step('shows the KPIs of every platform', async () => {
      await expect(digitalExperience.mobileKpiValue('Sessions')).toHaveText('4');
      await expect(digitalExperience.mobileKpiValue('Users')).toHaveText('3');
      await expect(digitalExperience.mobilePagePlatforms).toHaveText(['Android', 'iOS']);
    });

    await test.step('has no accessibility violations on the mobile page', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });

    await test.step('narrows the KPIs to an OS, kept in the URL, without moving the page', async () => {
      const kpisBefore = await digitalExperience.mobileKpis.boundingBox();

      await digitalExperience.selectMobileOs('iPadOS');
      await expect(page).toHaveURL(/osName=iPadOS/);
      await expect(digitalExperience.mobileKpiValue('Sessions')).toHaveText('1');

      // The picked OS lives in its capped button, so the toolbar keeps its height.
      expect((await digitalExperience.mobileKpis.boundingBox())?.y).toBe(kpisBefore?.y);
    });

    await test.step('compares to the previous period only with Compare on, kept across a reload', async () => {
      await expect(digitalExperience.mobileKpiChange('Sessions')).toBeHidden();

      await digitalExperience.toggleMobileCompare();
      await expect(page).toHaveURL(/compare=true/);
      await expect(digitalExperience.mobileKpiPrevious('Sessions')).toBeVisible();

      await page.reload();
      await expect(digitalExperience.mobileKpiPrevious('Sessions')).toBeVisible();

      await digitalExperience.toggleMobileCompare();
      await expect(page).not.toHaveURL(/compare=/);
      await expect(digitalExperience.mobileKpiPrevious('Sessions')).toBeHidden();
    });
  });

  test('shows the release health of an application with enough sessions, drawn', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoApplication(MOBILE_APPS.busyAndroid, {
      ...TIME_RANGE,
      source: 'otel',
      applicationType: 'mobile',
    });

    await test.step('lists the release in the table, with its error rate', async () => {
      await expect(digitalExperience.mobileReleaseHealth).toBeVisible();
      await expect(
        digitalExperience.mobileReleaseTable.getByText(BUSY_RELEASE, { exact: true })
      ).toBeVisible();
    });

    await test.step('draws both charts, the release in their legends', async () => {
      await expect(
        digitalExperience.mobileReleaseChartSeries(
          digitalExperience.mobileReleaseErrorRateChart,
          BUSY_RELEASE
        )
      ).toBeVisible();
      await expect(
        digitalExperience.mobileReleaseChartSeries(
          digitalExperience.mobileReleaseAdoptionChart,
          BUSY_RELEASE
        )
      ).toBeVisible();
    });

    await test.step('has no accessibility violations with the charts drawn', async () => {
      const { violations } = await page.checkA11y({ include: ['main'] });
      expect(violations).toHaveLength(0);
    });
  });

  test('filters the page by a release from its table, and takes the filter off', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoApplication(MOBILE_APPS.android, {
      ...TIME_RANGE,
      source: 'otel',
      applicationType: 'mobile',
    });
    await expect(digitalExperience.mobileKpiValue('Sessions')).toHaveText('3');

    await test.step('narrows the URL and the data to the release', async () => {
      await digitalExperience.mobileReleaseFilter('2.9.0').click();
      await expect(page).toHaveURL(/release=2\.9\.0/);
      await expect(digitalExperience.mobileKpiValue('Sessions')).toHaveText('2');
      await expect(digitalExperience.mobileReleaseFilterRemove('2.9.0')).toBeVisible();
    });

    await test.step('takes the filter off from its pill', async () => {
      await digitalExperience.mobileReleaseFilterRemove('2.9.0').click();
      await expect(page).not.toHaveURL(/release=/);
      await expect(digitalExperience.mobileKpiValue('Sessions')).toHaveText('3');
      await expect(digitalExperience.mobileReleaseFilter('2.9.0')).toBeVisible();
    });
  });
});
