/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test, expect, tags } from '../../../fixtures';

test.describe(
  'Privileged User Monitoring - Page',
  { tag: tags.stateful.classic },
  () => {
    test.beforeAll(async ({ esArchiver }) => {
      await esArchiver.loadIfNeeded('linux_process');
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterAll(async ({ esArchiver }) => {
      try {
        await esArchiver.unload('linux_process');
      } catch {
        // Best-effort cleanup
      }
    });

    test('renders page as expected', async ({ pageObjects }) => {
      await pageObjects.entityAnalyticsPrivMon.navigate();
      await expect(pageObjects.entityAnalyticsPrivMon.onboardingPanel.first()).toContainText(
        'Privileged user monitoring'
      );
    });
  }
);
