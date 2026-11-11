/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

// Inside the RUM test data, so the dashboard keeps showing data; typed as the picker displays it.
const NEW_TIME_RANGE = { from: 'Jan 18, 2021 @ 12:15:00.000', to: 'Jan 18, 2021 @ 12:45:00.000' };

const hasRangeFrom = (url: URL, prefix: string): boolean =>
  url.searchParams.get('rangeFrom')?.startsWith(prefix) ?? false;

test.describe(
  'Digital Experience application overview',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('renders the Classic RUM dashboard of the application', async ({
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.SERVICE_NAME);

      await expect(digitalExperience.overviewTab).toBeVisible();
      await expect(digitalExperience.breadcrumbs).toContainText('Overview');
      await expect(digitalExperience.classicRumPageLoadMetric).toBeVisible();
      await expect(digitalExperience.classicRumServiceSelect).toBeHidden();
    });

    test('leaves the Overview for another app without leaving its search session open', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await digitalExperience.gotoApplication(testData.SERVICE_NAME);
      await expect(digitalExperience.classicRumPageLoadMetric).toBeVisible();

      // An in-app navigation, so dev mode raises a fatal error if the session is still open.
      await digitalExperience.apmTracesNavEntry.click();

      await expect(page).toHaveURL(/\/app\/apm\/traces/);
      await expect(digitalExperience.breadcrumbs).toContainText('Traces');
      await expect(digitalExperience.fatalErrorScreen).toBeHidden();
    });

    test('keeps the time range in sync between the dashboard and the page URL', async ({
      page,
      pageObjects: { digitalExperience, datePicker },
    }) => {
      await digitalExperience.gotoApplication(testData.SERVICE_NAME);
      await expect(digitalExperience.classicRumPageLoadMetric).toBeVisible();
      const initialRangeText = await datePicker.getTimeRangeText();

      await test.step('a range picked in the dashboard reaches the page URL', async () => {
        await datePicker.setAbsoluteRange(NEW_TIME_RANGE);

        await expect(page).toHaveURL((url) => hasRangeFrom(url, '2021-01-18T12:15'));
        const applicationsLink = digitalExperience.breadcrumbLink('Applications');
        await expect(applicationsLink).toHaveAttribute('href', /rangeFrom=2021-01-18T12%3A15/);
      });

      await test.step('going back restores the previous range in the dashboard', async () => {
        await page.goBack();

        await expect(page).toHaveURL(
          (url) => url.searchParams.get('rangeFrom') === testData.TIME_RANGE.rangeFrom
        );
        await expect.poll(() => datePicker.getTimeRangeText()).toBe(initialRangeText);
      });
    });
  }
);
