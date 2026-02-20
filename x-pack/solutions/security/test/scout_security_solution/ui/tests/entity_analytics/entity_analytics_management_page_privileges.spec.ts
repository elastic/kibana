/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 *
 * This test suite does not run on serverless because it requires a custom role.
 */

import { test, expect, tags } from '../../fixtures';

test.describe(
  'Entity analytics management page - Risk Engine Privileges Behaviour',
  { tag: tags.stateful.classic },
  () => {
    test('should not show the callout for superuser', async ({
      browserAuth,
      pageObjects,
      page,
    }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.entityAnalyticsManagement.navigate();

      await expect(
        pageObjects.entityAnalyticsManagement.riskScoreStatusLoading
      ).not.toBeVisible();
      await expect(
        pageObjects.entityAnalyticsManagement.riskScorePrivilegesCallout
      ).not.toBeVisible();
    });

    test('should show the callout, disable the risk score switch, and hide preview for user without risk engine privileges', async ({
      browserAuth,
      pageObjects,
    }) => {
      const { ROLES } = await import('@kbn/security-solution-plugin/common/test');
      await browserAuth.loginWithCustomRole(ROLES.no_risk_engine_privileges);
      await pageObjects.entityAnalyticsManagement.navigate();

      await expect(
        pageObjects.entityAnalyticsManagement.riskScoreStatusLoading
      ).not.toBeVisible();
      await expect(
        pageObjects.entityAnalyticsManagement.riskScorePrivilegesCallout.first()
      ).toBeVisible();
      await expect(
        pageObjects.entityAnalyticsManagement.riskScorePrivilegesCallout
      ).toContainText('Missing read, write privileges for the risk-score.risk-score-* index.');
      await expect(
        pageObjects.entityAnalyticsManagement.riskScorePrivilegesCallout
      ).toContainText('manage_index_templates');
      await expect(
        pageObjects.entityAnalyticsManagement.riskScorePrivilegesCallout
      ).toContainText('manage_transform');
      await expect(
        pageObjects.entityAnalyticsManagement.riskScorePreviewPrivilegesCallout
      ).toBeVisible();
      await expect(
        pageObjects.entityAnalyticsManagement.riskScoreSwitch.first()
      ).toBeDisabled();
    });
  }
);
