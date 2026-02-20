/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';

const ASSET_CRITICALITY_CSV =
  'user,user-001,medium_impact\nuser,user-002,medium_impact\nhost,host-001,extreme_impact\nhost,host-002,extreme_impact\nhost,host-003,invalid_value';

test.describe(
  'Asset Criticality Upload page',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('renders page as expected', async ({ pageObjects }) => {
      await pageObjects.entityAnalyticsAssetCriticality.navigate();
      await expect(
        pageObjects.entityAnalyticsAssetCriticality.pageTitle
      ).toContainText('Entity store');
    });

    test('uploads a file', async ({ pageObjects }) => {
      const assetPage = pageObjects.entityAnalyticsAssetCriticality;
      await assetPage.navigate();

      const buffer = Buffer.from(ASSET_CRITICALITY_CSV);
      await assetPage.uploadFile(buffer);

      await expect(assetPage.filePicker.first()).not.toBeVisible();
      await expect(assetPage.validLinesMessage.first()).toHaveText(
        '4 asset criticality levels will be assigned'
      );
      await expect(assetPage.invalidLinesMessage.first()).toHaveText(
        "1 line is invalid and won't be assigned"
      );

      await assetPage.clickAssign();

      await expect(assetPage.resultStep.first()).toBeVisible();
    });
  }
);
