/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  HOST_FLYOUT_ENTITY_ID,
  HOST_FLYOUT_HOST_NAME,
  MOCK_ANOMALY_OVERVIEW_EMPTY,
  MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS,
  MOCK_ANOMALY_SUMMARY,
} from '@kbn/scout-security/src/playwright/fixtures/test/page_objects/entity_flyout_anomalies_page';

const ANOMALY_OVERVIEW_ROUTE = `**/internal/entity_analytics/entities/host/${HOST_FLYOUT_ENTITY_ID}/anomaly_overview`;
const ANOMALY_SUMMARY_ROUTE = `**/internal/entity_analytics/entities/host/${HOST_FLYOUT_ENTITY_ID}/anomaly_summary`;
const ANOMALY_PRIVILEGES_ROUTE = '**/internal/entity_analytics/anomalies/privileges';

spaceTest.describe(
  'Entity flyout anomalies',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.installEntityStoreV2(['host']);
      await apiServices.entityAnalytics.indexEntityStoreEntry(
        HOST_FLYOUT_ENTITY_ID,
        HOST_FLYOUT_HOST_NAME
      );
    });

    spaceTest.beforeEach(async ({ browserAuth, page }) => {
      await browserAuth.loginAsAdmin();
      // The privileges check gates every anomalies fetch below and isn't itself under test here;
      // mock it so a transient real-backend hiccup can't make the anomalies section silently
      // never load (see the flakiness this caused when left to hit the real endpoint).
      await page.route(ANOMALY_PRIVILEGES_ROUTE, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            has_all_required: true,
            privileges: { elasticsearch: {} },
          }),
        });
      });
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.uninstallEntityStoreV2(['host']);
    });

    spaceTest(
      'host right panel shows anomalies section when the entity has anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesSection).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesExpandablePanel).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesRecentTable).toBeVisible();
      }
    );

    spaceTest(
      'host right panel does not show anomalies section when the entity has no anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_EMPTY),
          });
        });

        const overviewResponse = page.waitForResponse(ANOMALY_OVERVIEW_ROUTE, { timeout: 30000 });
        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();
        await overviewResponse;

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesSection).toBeHidden();
      }
    );

    spaceTest(
      'host entity details left panel shows anomalies tab and tab content when the entity has anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTab).toBeVisible();

        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabAttackChain).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTimeline).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTable).toBeVisible();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTableGrid).toBeVisible();
        await expect(
          pageObjects.entityFlyoutAnomaliesPage.anomaliesTabManageJobsButton
        ).toBeVisible();
      }
    );

    spaceTest(
      'host right panel does not show anomalies section when the anomaly overview API returns an error',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, (route) => route.fulfill({ status: 500 }));

        const overviewResponse = page.waitForResponse(ANOMALY_OVERVIEW_ROUTE, { timeout: 30000 });
        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();
        await overviewResponse;

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesSection).toBeHidden();
      }
    );

    spaceTest(
      'host entity details left panel does not show anomalies tab when the entity has no anomalies',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_EMPTY),
          });
        });

        const overviewResponse = page.waitForResponse(ANOMALY_OVERVIEW_ROUTE, { timeout: 30000 });
        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();
        await overviewResponse;

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTab).toBeHidden();
      }
    );

    spaceTest(
      'host entity details left panel anomalies tab shows table but not attack chain when entity has no tactic associations',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostBothPanels();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesTab();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabAttackChain).toBeHidden();
        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTabTable).toBeVisible();
      }
    );

    spaceTest(
      'clicking the anomalies count link in the right panel opens the entity details left panel on the anomalies tab',
      async ({ page, pageObjects }) => {
        await page.route(ANOMALY_OVERVIEW_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES),
          });
        });
        await page.route(ANOMALY_SUMMARY_ROUTE, async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_ANOMALY_SUMMARY),
          });
        });

        await pageObjects.entityFlyoutAnomaliesPage.navigateToHostRightPanel();
        await pageObjects.entityFlyoutAnomaliesPage.clickAnomaliesCountLink();

        await expect(pageObjects.entityFlyoutAnomaliesPage.anomaliesTab).toBeVisible();
      }
    );
  }
);
