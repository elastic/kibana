/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../../fixtures';
import { APP_ENDPOINTS_PATH } from '../../../../common/defend_workflows_urls';

test.describe(
  'Endpoints page - mocked data',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('should display endpoint list page', async ({ page, pageObjects }) => {
      await pageObjects.endpointList.goto();
      await pageObjects.endpointList.waitForPageToLoad();
      await expect(page).toHaveURL(new RegExp(`.*${APP_ENDPOINTS_PATH}.*`));
      await expect(page.testSubj.locator('endpointListTable').first()).toBeVisible();
    });

    test.skip('should display mocked endpoint data - requires indexEndpointHosts/esArchiver', async () => {
      // Skipped: requires indexEndpointHosts task / esArchiver data
    });

    test.skip('should sort by host status - requires mocked endpoints', async () => {
      // Skipped: requires indexEndpointHosts setup
    });
  }
);
