/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';

const hasTimeRange = (url: URL): boolean =>
  url.searchParams.get('rangeFrom') === testData.TIME_RANGE.rangeFrom &&
  url.searchParams.get('rangeTo') === testData.TIME_RANGE.rangeTo;

test.describe(
  'Digital Experience applications list',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('opens an application from the list, keeping the time range', async ({
      page,
      pageObjects: { digitalExperience },
    }) => {
      await test.step('lists the application with RUM data', async () => {
        await digitalExperience.gotoApplications();

        await expect(digitalExperience.breadcrumbs).toContainText('Digital experience');
        await expect(digitalExperience.applicationLink(testData.SERVICE_NAME)).toBeVisible();
      });

      await test.step('opens its Overview with the same time range', async () => {
        await digitalExperience.applicationLink(testData.SERVICE_NAME).click();

        await expect(digitalExperience.overviewTab).toBeVisible();
        await expect(page).toHaveURL(hasTimeRange);
        await expect(digitalExperience.breadcrumbs).toContainText(testData.SERVICE_NAME);
      });

      await test.step('links back to the list with the same time range', async () => {
        const applicationsLink = digitalExperience.breadcrumbLink('Applications');
        await expect(applicationsLink).toHaveAttribute('href', /\/app\/digital_experience\/?\?/);
        const href = String(await applicationsLink.getAttribute('href'));

        expect(hasTimeRange(new URL(href, page.url()))).toBe(true);
      });
    });
  }
);
