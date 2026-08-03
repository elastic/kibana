/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_SPA_SHELL_TIMEOUT_MS, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

/** `logs_essentials` config disables many apps — assert core nav plus absence of gated items. */
test.describe(
  'Serverless Observability Navigation - Logs Essentials tier body',
  { tag: [...tags.serverless.observability.logs_essentials] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.observabilityNavigation.goto();
      await pageObjects.observabilityNavigation.waitForLoad();
    });

    test('renders expected body nav items with working links', async ({ pageObjects }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('primary body items are visible and linked', async () => {
        const primaryDeepLinks = [
          'discover',
          'dashboards',
          'workflows',
          'observability-overview:alerts',
        ];
        for (const deepLinkId of primaryDeepLinks) {
          const item = nav.navItemInPrimaryByDeepLinkId(deepLinkId);
          await expect(item).toBeVisible();
          await expect(item).toHaveAttribute('href', /.+/);
        }
      });

      await test.step('Higher-tier-only nav items are absent', async () => {
        const disabledDeepLinks = ['observability-overview:cases', 'slo'];
        for (const deepLinkId of disabledDeepLinks) {
          await expect(nav.navItemInBodyByDeepLinkId(deepLinkId)).toBeHidden();
        }

        const disabledIds = ['applications', 'metrics', 'machine_learning-landing'];
        for (const id of disabledIds) {
          await expect(nav.navItemInBodyById(id)).toBeHidden();
        }
      });
    });

    test('does not show ML or AI related project settings', async ({ pageObjects }) => {
      const nav = pageObjects.observabilityNavigation;

      await nav.navItemInFooterById('admin_and_settings').click();
      const adminAndSettingsPanel = nav.sidePanel('admin_and_settings');
      await expect(adminAndSettingsPanel).toBeVisible();

      const disabledIds = ['machine_learning', 'model_management'];
      for (const id of disabledIds) {
        await expect(
          adminAndSettingsPanel.locator(`[data-test-subj~="nav-item-id-${id}"]`)
        ).toBeHidden();
      }

      const disabledDeepLinks = [
        'management:overview',
        'management:anomaly_detection',
        'management:analytics',
        'management:trained_models',
        'management:supplied_configurations',
        'management:elastic_inference_service',
        'management:inference_endpoints',
        'management:model_settings',
        'management:genAiSettings',
        'management:evals',
        'management:observabilityAiAssistantManagement',
      ];
      for (const deepLinkId of disabledDeepLinks) {
        await expect(
          adminAndSettingsPanel.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`)
        ).toBeHidden();
      }
    });

    test('clicking body nav items sets the active link and navigates', async ({
      pageObjects,
      page,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('Discover', async () => {
        await nav.navItemInPrimaryByDeepLinkId('discover').click();
        await expect(nav.pageOrNoData('dscPage')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('discover')).toBeVisible();
      });

      await test.step('Dashboards', async () => {
        await nav.navItemInPrimaryByDeepLinkId('dashboards').click();
        await expect(nav.pageOrNoData('dashboardLandingPage')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('dashboards')).toBeVisible();
      });

      await test.step('Workflows', async () => {
        await nav.navItemInPrimaryByDeepLinkId('workflows').click();
        await expect(page.testSubj.locator('workflowsServerlessTierAccessDenied')).toBeVisible();
      });

      await test.step('Alerts', async () => {
        await nav.navItemInPrimaryByDeepLinkId('observability-overview:alerts').click();
        await expect(page.testSubj.locator('alertsPageWithData')).toBeVisible();
        await expect(nav.activeNavItemByDeepLinkId('observability-overview:alerts')).toBeVisible();
      });
    });

    test('disabled apps return a not-found page when visited directly', async ({ page }) => {
      await test.step('/app/observability/cases shows the observability 404 page', async () => {
        await page.gotoApp('observability/cases');
        await expect(page.testSubj.locator('observabilityPageNotFoundBanner')).toBeVisible();
      });
    });

    test('Model Management pages are not reachable via direct URL or global search', async ({
      page,
      pageObjects,
    }) => {
      const nav = pageObjects.observabilityNavigation;

      await test.step('direct URL falls back to the management landing page', async () => {
        await page.gotoApp('management/modelManagement/model_settings');
        await expect(page.testSubj.locator('cards-navigation-page')).toBeVisible({
          timeout: OBSERVABILITY_SPA_SHELL_TIMEOUT_MS,
        });
      });

      await test.step('pages do not appear in global search', async () => {
        await nav.goto();
        await nav.waitForLoad();

        await page.testSubj.click('nav-search-reveal');
        await page.testSubj.fill('nav-search-input', 'Elastic Inference');
        await expect(
          page.testSubj
            .locator('euiSelectableMessage')
            .locator('[data-test-subj~="nav-search-no-results"]')
        ).toBeVisible();
      });
    });
  }
);
