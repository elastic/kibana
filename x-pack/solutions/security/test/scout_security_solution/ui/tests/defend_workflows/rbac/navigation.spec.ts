/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { APP_ENDPOINTS_PATH, APP_POLICIES_PATH } from '../../../../common/defend_workflows_urls';

test.describe(
  'Defend Workflows - RBAC navigation',
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('navigates to Endpoints page', async ({ page }) => {
      await page.goto(APP_ENDPOINTS_PATH);
      await expect(page).toHaveURL(new RegExp(`.*administration/endpoints.*`));
    });

    test('navigates to Policies page', async ({ page }) => {
      await page.goto(APP_POLICIES_PATH);
      await expect(page).toHaveURL(new RegExp(`.*administration/policy.*`));
    });

    test('navigates to Trusted Apps page', async ({ page }) => {
      await page.goto('/app/security/administration/trusted_apps');
      await expect(page).toHaveURL(new RegExp(`.*administration/trusted_apps.*`));
    });

    test('navigates to Event Filters page', async ({ page }) => {
      await page.goto('/app/security/administration/event_filters');
      await expect(page).toHaveURL(new RegExp(`.*administration/event_filters.*`));
    });
  }
);
