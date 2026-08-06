/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

const TEST_TIMEOUT = 3 * 60 * 1000;
/** Matches the SLO seeded by global.setup.ts via the worker-scoped sloData fixture. */
const SLO_NAME = 'Test Stack SLO';
const ALL_INSTANCES = 'All instances';

test.describe(
  'SLO Overview Embeddable',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // eslint-disable-next-line @kbn/eslint/scout_no_describe_configure
    test.describe.configure({ timeout: TEST_TIMEOUT });

    test.beforeEach(async ({ pageObjects, browserAuth }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.dashboard.openNewDashboard();
    });

    test('configures a single SLO overview panel from the add panel flyout', async ({
      page,
      pageObjects,
    }) => {
      const { dashboard, sloEmbeddable, toasts } = pageObjects;

      await test.step('open add panel flyout and pick SLO Overview', async () => {
        await dashboard.openAddPanelFlyout();
        await expect(page.testSubj.locator('dashboardEditorMenu-observabilityGroup')).toBeVisible();
        await sloEmbeddable.addOverviewPanelFromFlyout();
        await expect(sloEmbeddable.singleConfigurationFlyout).toBeVisible();
      });

      await test.step('configure single SLO selection', async () => {
        await expect(sloEmbeddable.overviewModeSelector).toBeVisible();
        await expect(sloEmbeddable.definitionSelector).toBeVisible();
        await sloEmbeddable.selectDefinition(SLO_NAME);

        await expect(sloEmbeddable.instanceSelector).toBeVisible();
        await sloEmbeddable.selectInstance(ALL_INSTANCES);

        await sloEmbeddable.confirm();
      });

      await test.step('renders SLO card item chart', async () => {
        await expect(sloEmbeddable.singleOverviewPanel).toBeVisible();
        // "All instances" renders one Elastic Charts metric card per SLO instance.
        // Assert at least one chart + one metric title rendered, and that the panel
        // shows the SLO name. This preserves FTR parity (the FTR SLO had a single
        // instance) without depending on the seeded data cardinality. Global setup
        // force-runs the SLO transforms so default assertion timeouts are sufficient.
        await expect(sloEmbeddable.singleOverviewPanel.locator('.echChart')).not.toHaveCount(0);
        await expect(
          sloEmbeddable.singleOverviewPanel.locator('.echMetricText__title')
        ).not.toHaveCount(0);
        await expect(sloEmbeddable.singleOverviewPanel).toContainText(SLO_NAME);

        await toasts.closeAll();
      });
    });

    test('configures a group SLO overview panel from the add panel flyout', async ({
      pageObjects,
    }) => {
      const { dashboard, sloEmbeddable } = pageObjects;

      await test.step('open add panel flyout and pick SLO Overview', async () => {
        await dashboard.openAddPanelFlyout();
        await sloEmbeddable.addOverviewPanelFromFlyout();
        await expect(sloEmbeddable.singleConfigurationFlyout).toBeVisible();
      });

      await test.step('switch to group overview mode', async () => {
        await sloEmbeddable.switchToGroupMode();
        await expect(sloEmbeddable.groupConfigurationFlyout).toBeVisible();
      });

      await test.step('group configuration exposes group-by, group, and KQL controls', async () => {
        await expect(sloEmbeddable.groupByField).toBeVisible();
        await expect(sloEmbeddable.groupField).toBeVisible();
        await expect(sloEmbeddable.kqlBar).toBeVisible();
      });

      await test.step('creates a group overview panel', async () => {
        await sloEmbeddable.confirm();
        await expect(sloEmbeddable.groupOverviewPanel).toBeVisible();
      });
    });
  }
);
