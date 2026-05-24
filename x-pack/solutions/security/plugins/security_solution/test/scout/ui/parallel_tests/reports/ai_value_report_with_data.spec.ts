/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'AI Value Report - with Attack Discovery data',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.stateful.security,
      ...tags.serverless.security.complete,
      ...tags.serverless.security.ease,
    ],
  },
  () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.attackDiscovery.seedAttackData();
    });

    spaceTest(
      'renders the live report layout when Attack Discovery data exists',
      async ({ browserAuth, pageObjects }) => {
        const { aiValueReportPage } = pageObjects;

        await browserAuth.loginAsSecurityRole('soc_manager');
        await aiValueReportPage.navigate();

        await expect(aiValueReportPage.page).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.sampleBanner).not.toBeVisible();
        await expect(aiValueReportPage.sampleDataBadge).not.toBeVisible();
        await expect(aiValueReportPage.executiveSummary).toBeVisible();
        await expect(aiValueReportPage.exportButton).toBeEnabled();
      }
    );

    spaceTest(
      'shows the no-results empty state when Attack Discovery data is outside the selected range',
      async ({ browserAuth, pageObjects }) => {
        const { aiValueReportPage, datePicker } = pageObjects;

        await browserAuth.loginAsSecurityRole('soc_manager');
        await aiValueReportPage.navigate();

        await expect(aiValueReportPage.page).toBeVisible({ timeout: 30000 });

        await datePicker.setAbsoluteRange({
          from: 'Jan 1, 2020 @ 00:00:00.000',
          to: 'Jan 2, 2020 @ 00:00:00.000',
        });

        await expect(aiValueReportPage.noResultsEmptyState).toBeVisible();
        await expect(
          aiValueReportPage.noResultsEmptyState.getByText(
            'Adjust the time range in the top bar to see available results for the Value Report.'
          )
        ).toBeVisible();
        await expect(aiValueReportPage.sampleBanner).not.toBeVisible();
        await expect(aiValueReportPage.sampleDataBadge).not.toBeVisible();
        await expect(aiValueReportPage.executiveSummary).not.toBeVisible();
      }
    );
  }
);
