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
      await digitalExperience.gotoApplications(TIME_RANGE);
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

    await test.step('narrows the KPIs to an OS, kept in the URL', async () => {
      await digitalExperience.selectMobileOs('iPadOS');
      await expect(page).toHaveURL(/osName=iPadOS/);
      await expect(digitalExperience.mobileKpiValue('Sessions')).toHaveText('1');
    });

    await test.step('compares to the previous period only with Compare on, kept across a reload', async () => {
      await expect(digitalExperience.mobileKpiChange('Sessions')).toBeHidden();

      await digitalExperience.mobileCompareToggle.click();
      await expect(page).toHaveURL(/compare=true/);
      await expect(digitalExperience.mobileKpiPrevious('Sessions')).toBeVisible();

      await page.reload();
      await expect(digitalExperience.mobileCompareToggle).toBeChecked();
      await expect(digitalExperience.mobileKpiPrevious('Sessions')).toBeVisible();

      await digitalExperience.mobileCompareToggle.click();
      await expect(page).not.toHaveURL(/compare=/);
      await expect(digitalExperience.mobileKpiPrevious('Sessions')).toBeHidden();
    });
  });
});
