/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const OS_NAME_CHART_ID = 'ux-visitor-breakdown-user_agent-os-name';
const UA_NAME_CHART_ID = 'ux-visitor-breakdown-user_agent-name';

test.describe('UX Visitor Breakdown', { tag: tags.stateful.classic }, () => {
  test('displays visitor breakdown charts', async ({ pageObjects, browserAuth }) => {
    await test.step('Navigate to UX Dashboard', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.uxDashboard.goto();
      await pageObjects.uxDashboard.waitForLoadingToFinish();
    });

    await test.step('Confirm visitor breakdown charts are visible', async () => {
      await pageObjects.uxDashboard.scrollToSection('Page load duration by region (avg.)');
      await pageObjects.uxDashboard.waitForChartData();
      await pageObjects.uxDashboard.waitForLoadingToFinish();

      await expect(pageObjects.uxDashboard.lensEmbeddableLocator(OS_NAME_CHART_ID)).toBeVisible();
      await expect(pageObjects.uxDashboard.lensEmbeddableLocator(UA_NAME_CHART_ID)).toBeVisible();
    });
  });
});
