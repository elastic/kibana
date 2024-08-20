/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { test } from '../fixtures/es_archiver';

test.describe('Enable risk scores from dashboard', () => {
  test.use({ storageState: '.auth/user.json' });
  test('host risk enable button should redirect to entity management page', async ({
    page,
    esArchiver,
  }) => {
    await esArchiver.load('auditbeat_single');

    await page.goto('/app/security/entity_analytics');

    await expect(page.locator('[data-test-subj="enable_host_risk_score"]')).toBeVisible({
      timeout: 60000,
    });

    await page.locator('[data-test-subj="enable_host_risk_score"]').click();

    await expect(page.locator('[data-test-subj="entityAnalyticsManagementPageTitle"]')).toHaveText(
      'Entity Risk Score',
      { timeout: 60000 }
    );
  });

  test('user risk enable button should redirect to entity management page', async ({ page }) => {
    await page.goto('/app/security/entity_analytics');

    await expect(page.locator('[data-test-subj="enable_user_risk_score"]')).toBeVisible({
      timeout: 60000,
    });

    await page.locator('[data-test-subj="enable_user_risk_score"]').click();

    await expect(page.locator('[data-test-subj="entityAnalyticsManagementPageTitle"]')).toHaveText(
      'Entity Risk Score',
      { timeout: 60000 }
    );
  });
});
