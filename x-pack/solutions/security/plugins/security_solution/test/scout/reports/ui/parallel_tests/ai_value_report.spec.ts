/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

// tests consistently fail in MKI runs, see https://github.com/elastic/kibana/issues/273847
spaceTest.describe(
  'AI Value Report',
  {
    tag: [
      '@local-stateful-classic',
      '@local-serverless-security_complete',
      '@local-serverless-security_ease',
    ],
  },
  () => {
    spaceTest(
      'renders the sample data banner, badge and attack discovery CTA when there are no attack discoveries',
      async ({ browserAuth, pageObjects }) => {
        const { aiValueReportPage } = pageObjects;

        await browserAuth.loginAsSecurityRole('soc_manager');
        await aiValueReportPage.navigate();

        await expect(aiValueReportPage.container).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.sampleBanner).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.sampleDataBadge).toBeVisible();
        await expect(aiValueReportPage.attackDiscoveryCtaButton).toBeVisible();
      }
    );

    spaceTest(
      'export button is disabled when there is no real data',
      async ({ browserAuth, pageObjects }) => {
        const { aiValueReportPage } = pageObjects;

        await browserAuth.loginAsSecurityRole('soc_manager');
        await aiValueReportPage.navigate();

        await expect(aiValueReportPage.container).toBeVisible({ timeout: 30000 });
        await expect(aiValueReportPage.exportButton).toBeVisible();
        await expect(aiValueReportPage.exportButton).toBeDisabled();
      }
    );

    spaceTest(
      'shows NoPrivileges for a user without the socManagement capability',
      async ({ browserAuth, pageObjects }) => {
        const { aiValueReportPage } = pageObjects;

        await browserAuth.loginAsViewer();
        await aiValueReportPage.navigate();

        await expect(aiValueReportPage.noPrivilegesPage).toBeVisible({ timeout: 30000 });
      }
    );
  }
);
