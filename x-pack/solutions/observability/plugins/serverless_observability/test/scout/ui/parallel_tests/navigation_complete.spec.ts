/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe(
  'Serverless Observability Navigation - Complete tier',
  { tag: [...tags.serverless.observability.complete] },
  () => {
    test('shows complete-tier-only navigation items', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.serverlessNav.goto();

      await test.step('Machine Learning panel is visible in More menu', async () => {
        await pageObjects.collapsibleNav.openMoreMenu();
        await expect(
          pageObjects.collapsibleNav.getNavItemById('machine_learning-landing')
        ).toBeVisible();
      });
    });
  }
);
