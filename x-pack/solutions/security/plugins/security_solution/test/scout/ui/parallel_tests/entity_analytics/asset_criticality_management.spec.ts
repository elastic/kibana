/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Entity analytics management page - Asset Criticality tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest(
      'should display info panel, file upload section and doc link',
      async ({ pageObjects }) => {
        const managementPage = pageObjects.entityAnalyticsManagementPage;

        await managementPage.navigate();
        await managementPage.navigateToAssetCriticalityTab();

        await expect(managementPage.assetCriticalityTab).toHaveAttribute('aria-selected', 'true');
        await expect(managementPage.assetCriticalityInfoPanel).toBeVisible({ timeout: 30000 });
        await expect(managementPage.assetCriticalityFileUploadSection).toBeVisible();
        await expect(managementPage.assetCriticalityDocLink).toBeVisible();
      }
    );
  }
);
