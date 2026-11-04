/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

const { SERVICE_NAME, OTEL_APPS, OTEL_SHOP_PAGE_LOADS, TIME_RANGE } = testData;

const hasTimeRange = (url: URL): boolean =>
  url.searchParams.get('rangeFrom') === TIME_RANGE.rangeFrom &&
  url.searchParams.get('rangeTo') === TIME_RANGE.rangeTo;

test.describe(
  'Digital Experience application navigation',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { digitalExperience } }) => {
      await browserAuth.loginAsViewer();
      await digitalExperience.gotoApplications();
    });

    test('opens the Overview matching the source of the application, keeping the time range', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await test.step('opens the Classic Overview from a Classic row', async () => {
        await digitalExperience.selectSource('Classic RUM');
        await digitalExperience.applicationLink(SERVICE_NAME).click();

        await expect(digitalExperience.overviewTab).toBeVisible();
        await expect(page).toHaveURL(hasTimeRange);
        await expect(page).toHaveURL(/source=classic/);
        await expect(digitalExperience.breadcrumbs).toContainText(SERVICE_NAME);
        await expect(digitalExperience.otelOverviewKpis).toBeHidden();
      });

      await test.step('goes back to the list with the same time range and filters', async () => {
        await digitalExperience.breadcrumbLink('Applications').click();

        await expect(digitalExperience.applicationRow(SERVICE_NAME)).toContainText('Classic RUM');
        await expect(page).toHaveURL(hasTimeRange);
        await expect(page).toHaveURL(/sourceFilter=classic/);
      });

      await test.step('opens the EDOT Browser Overview from an EDOT Browser row', async () => {
        await digitalExperience.selectSource('All sources');
        await digitalExperience.applicationLink(OTEL_APPS.shop).click();

        await expect(page).toHaveURL(/source=otel/);
        await expect(page).toHaveURL(hasTimeRange);
        await expect(digitalExperience.otelOverviewPageLoads).toContainText(OTEL_SHOP_PAGE_LOADS);
      });
    });
  }
);
