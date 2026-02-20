/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../fixtures';
import {
  ALERT_SUMMARY_URL,
  ALERTS_URL,
  RULES_URL,
  STACK_RULES_URL,
  MAINTENANCE_WINDOW_URL,
} from '../../common/urls';

const MANAGEMENT_PAGE_DESCRIPTION =
  'Manage data and indices, oversee rules and connectors, organize saved objects and files, and create API keys in a central location.';

const userRoles = [
  { name: 'Admin user', loginAs: 'admin' as const },
  { name: 'User with siem v1 role', loginAs: 'siemv1' as const },
  { name: 'User with siem v2 role', loginAs: 'siemV2' as const },
  { name: 'User with siem v3 role', loginAs: 'siemV3' as const },
  { name: 'User with siem v4 role', loginAs: 'siemV4' as const },
  { name: 'User with siem v5 role', loginAs: 'siemV5' as const },
];

test.describe(
  'AI4dSoC Capabilities - Access',
  { tag: [...tags.serverless.security.complete] },
  () => {
    for (const role of userRoles) {
      test.describe(`${role.name} capabilities`, () => {
        test.beforeEach(async ({ browserAuth }) => {
          await browserAuth.loginAs(role.loginAs);
        });

        test('should show alert summary prompt when visiting alert summary page', async ({
          pageObjects,
        }) => {
          await pageObjects.ai4dsoc.goto(ALERT_SUMMARY_URL);
          await expect(pageObjects.ai4dsoc.alertsSummaryPrompt.first()).toBeVisible();
        });

        test('should redirect from alerts to get started page', async ({ pageObjects, page }) => {
          await pageObjects.ai4dsoc.goto(ALERTS_URL);
          await expect(pageObjects.ai4dsoc.getStartedPage.first()).toBeVisible();
        });

        test('should redirect from rules to get started page', async ({ pageObjects }) => {
          await pageObjects.ai4dsoc.goto(RULES_URL);
          await expect(pageObjects.ai4dsoc.getStartedPage.first()).toBeVisible();
        });

        test('should redirect from stack rules to main management page', async ({
          pageObjects,
          page,
        }) => {
          await pageObjects.ai4dsoc.goto(STACK_RULES_URL);
          await expect(page.getByText(MANAGEMENT_PAGE_DESCRIPTION).first()).toBeVisible();
        });

        test('should redirect from maintenance window to main management page', async ({
          pageObjects,
          page,
        }) => {
          await pageObjects.ai4dsoc.goto(MAINTENANCE_WINDOW_URL);
          await expect(page.getByText(MANAGEMENT_PAGE_DESCRIPTION).first()).toBeVisible();
        });
      });
    }
  }
);
