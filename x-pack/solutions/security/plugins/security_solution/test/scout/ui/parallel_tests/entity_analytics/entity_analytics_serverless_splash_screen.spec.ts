/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Entity Analytics Dashboard paywall in Serverless Essentials',
  { tag: [...tags.serverless.security.essentials] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      const dashboardPage = pageObjects.entityAnalyticsDashboardsPage;
      await browserAuth.loginAsPlatformEngineer();
      await dashboardPage.navigate();
    });

    spaceTest(
      'should display a paywall splash screen with Security essentials PLI',
      async ({ pageObjects }) => {
        const dashboardPage = pageObjects.entityAnalyticsDashboardsPage;

        await expect(dashboardPage.paywallDescription).toContainText(
          'Entity risk scoring capability is available in our Security Complete license tier',
          { timeout: 30000 }
        );
      }
    );
  }
);
