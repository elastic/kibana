/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { DX_NAV_ENTRY, LEGACY_UX_NAV_ENTRY } from '../fixtures/constants';

const SERVICE_NAME = 'my-application';

test.describe('Digital Experience', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows the Applications list and its breadcrumbs', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get('/app/digital_experience'));

    await expect(page.testSubj.locator('digitalExperienceApplicationsEmpty')).toBeVisible();
    const breadcrumbs = page.testSubj.locator('breadcrumbs');
    await expect(breadcrumbs).toContainText('Digital Experience');
    await expect(breadcrumbs).toContainText('Applications');
  });

  test('shows the Overview tab and breadcrumbs of an application', async ({ page, kbnUrl }) => {
    await page.goto(kbnUrl.get(`/app/digital_experience/${SERVICE_NAME}`));

    await expect(page.testSubj.locator('digitalExperienceTab-overview')).toBeVisible();
    await expect(page.getByText('Sessions', { exact: true })).toBeHidden();
    const breadcrumbs = page.testSubj.locator('breadcrumbs');
    await expect(breadcrumbs).toContainText(SERVICE_NAME);
    await expect(breadcrumbs).toContainText('Overview');
  });

  test('hides the legacy User Experience section in the classic navigation', async ({
    page,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.get('/app/digital_experience'));

    await expect(page.testSubj.locator('digitalExperienceMainContainer')).toBeVisible();
    await expect(page.testSubj.locator(DX_NAV_ENTRY)).toBeVisible();
    await expect(page.testSubj.locator(LEGACY_UX_NAV_ENTRY)).toBeHidden();
  });

  test('keeps the time range in the URL and in the Applications breadcrumb', async ({
    page,
    kbnUrl,
  }) => {
    await page.goto(
      kbnUrl.get(`/app/digital_experience/${SERVICE_NAME}?rangeFrom=now-7d&rangeTo=now`)
    );

    await expect(page.testSubj.locator('digitalExperienceTab-overview')).toBeVisible();
    await expect(page).toHaveURL(/rangeFrom=now-7d&rangeTo=now/);
    await expect(
      page.testSubj.locator('breadcrumbs').getByRole('link', { name: 'Applications' })
    ).toHaveAttribute('href', /\/app\/digital_experience\?rangeFrom=now-7d&rangeTo=now$/);
  });
});
