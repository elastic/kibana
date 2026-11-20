/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { TIME_RANGE } = testData;

const SECTIONS = [
  'healthSummary',
  'releaseHealth',
  'stability',
  'usersAndEngagement',
  'performance',
  'views',
];

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
    await test.step('lists a row per platform, with its release, sessions and crash-free sessions', async () => {
      await digitalExperience.gotoApplications({ ...TIME_RANGE, platformFilter: 'ios' });

      const table = page.getByTestId('digitalExperienceMobileApplicationsTable');
      await expect(table).toBeVisible();
      const row = table.getByRole('row').filter({ hasText: MOBILE_APPS.reactNative });
      await expect(row).toHaveCount(1);
      await expect(row.getByTestId('digitalExperienceMobilePlatform')).toHaveText('iOS');
      await expect(row.getByTestId('digitalExperienceMobileLatestRelease')).toHaveText('1.0.0');
      // An iPhone and an iPad session: iPadOS counts as iOS.
      await expect(row.getByTestId('digitalExperienceMobileSessions')).toHaveText('2');
      await expect(row.getByTestId('digitalExperienceMobileCrashFree')).toHaveText(
        'Not enough data'
      );
      await expect(table.getByText(MOBILE_APPS.backendJava)).toBeHidden();
      await expect(table.getByText(MOBILE_APPS.browserOnIphone)).toBeHidden();
    });

    await test.step('opens the iOS page, which keeps its EDOT source and platform on reload', async () => {
      await page
        .getByTestId('digitalExperienceMobileApplicationLink')
        .filter({ hasText: MOBILE_APPS.reactNative })
        .click();

      await expect(page).toHaveURL(/platform=ios/);
      await expect(page).toHaveURL(/source=otel/);
      await expect(page.getByTestId('digitalExperienceMobileKpis')).toBeVisible();
      await page.reload();
      await expect(page).toHaveURL(/platform=ios/);
      await expect(page.getByTestId('digitalExperienceMobileKpis')).toBeVisible();
    });

    await test.step('shows the KPI row and every section', async () => {
      await expect(page.getByTestId('digitalExperienceMobileKpiSessionsValue')).toHaveText('2');
      await expect(page.getByTestId('digitalExperienceMobileKpiUsersValue')).toHaveText('2');
      await expect(page.getByTestId('digitalExperienceMobileKpiCrashFreeValue')).toHaveText(
        'Not enough data'
      );
      for (const section of SECTIONS) {
        await expect(page.getByTestId(`digitalExperienceMobileSection-${section}`)).toBeVisible();
      }
    });

    await test.step('compares to the previous period and explains how a value is calculated', async () => {
      await expect(page.getByTestId('digitalExperienceMobileKpiSessionsPrevious')).toBeHidden();
      await page.getByTestId('digitalExperienceMobileCompareToggle').click();
      await expect(page.getByTestId('digitalExperienceMobileKpiSessionsPrevious')).toBeVisible();

      await page.getByTestId('digitalExperienceMobileKpiSessionsTooltip').hover();
      await expect(page.getByText('Distinct session.id values in the time range.')).toBeVisible();
    });
  });

  test('shows the empty state for an application without mobile data', async ({
    page,
    pageObjects: { digitalExperience },
  }) => {
    await digitalExperience.gotoApplication(MOBILE_APPS.noData, {
      ...TIME_RANGE,
      source: 'otel',
      platform: 'android',
    });

    await expect(page.getByTestId('digitalExperienceMobileEmpty')).toBeVisible();
    await expect(page.getByTestId('digitalExperienceMobileAndroidDocsLink')).toBeVisible();
    await expect(page.getByTestId('digitalExperienceMobileIosDocsLink')).toBeVisible();
  });
});
