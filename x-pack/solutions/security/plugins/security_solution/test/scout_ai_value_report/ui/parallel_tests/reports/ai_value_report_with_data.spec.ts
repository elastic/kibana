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
      async ({ browserAuth, pageObjects, config }) => {
        const { aiValueReportPage } = pageObjects;
        const isServerless = config.serverless ?? false;

        await browserAuth.loginAsSecurityRole('soc_manager');
        await aiValueReportPage.navigate();

        await expect(aiValueReportPage.container).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.sampleBanner).toBeHidden();
        await expect(aiValueReportPage.sampleDataBadge).toBeHidden();
        await expect(aiValueReportPage.executiveSummary).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.exportButton).toBeVisible();
        // Serverless enables the export button on report data alone; stateful also
        // waits for an AI-generated insight, which requires a configured default AI
        // connector that this env does not provide.
        await expect
          .poll(() => aiValueReportPage.exportButton.isEnabled(), { timeout: 30000 })
          .toBe(isServerless);
      }
    );

    spaceTest(
      'shows the no-results empty state when Attack Discovery data is outside the selected range',
      async ({ browserAuth, pageObjects, page, kbnUrl, scoutSpace }) => {
        const { aiValueReportPage } = pageObjects;

        await browserAuth.loginAsSecurityRole('soc_manager');

        // Navigate directly with a historical time range so no seeded data falls within it.
        // The page reads `timerange` from the URL on mount via useInitTimerangeFromUrlParam,
        // so deep-linking is the correct way to set an initial range on a page with no SearchBar.
        const timerange =
          "(valueReport:(linkTo:!(),timerange:(from:'2020-01-01T00:00:00.000Z',kind:absolute,to:'2020-01-02T00:00:00.000Z')))";
        await page.goto(
          kbnUrl.app('security/reports/ai_value', {
            space: scoutSpace.id,
            pathOptions: { params: { timerange } },
          })
        );

        await expect(aiValueReportPage.container).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.noResultsEmptyState).toBeVisible({ timeout: 30000 });
        await expect(
          aiValueReportPage.noResultsEmptyState.getByText(
            'Adjust the time range in the top bar to see available results for the Value Report.'
          )
        ).toBeVisible();
        await expect(aiValueReportPage.sampleBanner).toBeHidden();
        await expect(aiValueReportPage.sampleDataBadge).toBeHidden();
        await expect(aiValueReportPage.executiveSummary).toBeHidden();
      }
    );
  }
);
