/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  DATE_WITH_MIXED_POD_DATA,
  DATE_WITH_SEMCONV_DATA,
  DATE_WITH_SEMCONV_POD_DATA,
  EXTENDED_TIMEOUT,
  POD_NAMES,
  SEMCONV_HOST1_NAME,
  SEMCONV_HOST2_NAME,
  SEMCONV_PODS,
} from '../../fixtures/constants';
import {
  cleanInventoryPodsSemconvSynthtraceData,
  ingestInventoryPodsSemconvSynthtraceData,
} from '../../fixtures/sequential_pods_synthtrace';

const SEMCONV_POD = SEMCONV_PODS[0];
const ECS_POD_NAME = POD_NAMES[0];

test.describe(
  'Infrastructure Inventory - Kubernetes Pods OpenTelemetry schema',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Sequential project (`playwright.config.ts` / `testDir: './tests'`): beforeAll /
    // afterAll are safe for the temporary pod Schema flag. Parallel Inventory stays
    // flag-off. This suite also ingests its own fixtures — sequential specs do not
    // run `parallel_tests/global.setup.ts`.
    test.beforeAll(async ({ apiServices, esClient, kbnUrl, log, config }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'observability.infra.podSchemaSelectorEnabled': true,
        },
      });
      log.info('Sequential suite: ingesting Inventory SemConv pod metrics');
      await ingestInventoryPodsSemconvSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPage();
    });

    test.afterAll(async ({ apiServices, esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: cleaning Inventory SemConv pod metrics');
      await cleanInventoryPodsSemconvSynthtraceData({ esClient, kbnUrl, log, config });
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'observability.infra.podSchemaSelectorEnabled': false,
        },
      });
    });

    test('OTel-only pods hydrate OpenTelemetry and render tiles', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();

      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      for (const pod of SEMCONV_PODS) {
        const waffleNode = await inventoryPage.podWaffleNodeByName(pod.name);
        await expect(waffleNode.container).toBeVisible();
        await expect(waffleNode.name).toHaveText(pod.name);
      }
    });

    test('mixed schemas default to OpenTelemetry pods and persist preferredSchema', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);
      await inventoryPage.showPods();

      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page).toHaveURL(/preferredSchema:semconv/);

      for (const pod of SEMCONV_PODS) {
        const waffleNode = await inventoryPage.podWaffleNodeByName(pod.name);
        await expect(waffleNode.container).toBeVisible();
      }

      const ecsPod = await inventoryPage.podWaffleNodeByName(ECS_POD_NAME);
      await expect(ecsPod.container).toHaveCount(0);
    });

    test('switching schema shows ECS pods and persists across reload', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      await inventoryPage.selectSchema('Elastic System Integration');
      await expect(page).toHaveURL(/preferredSchema:ecs/);
      // Selecting a schema can jump the waffle time to now. Pin the mixed window again.
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);
      await expect(inventoryPage.schemaSelect).toContainText('Elastic System Integration', {
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page).toHaveURL(/preferredSchema:ecs/);

      const ecsPod = await inventoryPage.podWaffleNodeByName(ECS_POD_NAME);
      await expect(ecsPod.container).toBeVisible();

      for (const pod of SEMCONV_PODS) {
        const waffleNode = await inventoryPage.podWaffleNodeByName(pod.name);
        await expect(waffleNode.container).toHaveCount(0);
      }

      await inventoryPage.reload();
      await inventoryPage.goToTime(DATE_WITH_MIXED_POD_DATA);
      await expect(inventoryPage.schemaSelect).toContainText('Elastic System Integration', {
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page).toHaveURL(/preferredSchema:ecs/);
      const ecsPodAfterReload = await inventoryPage.podWaffleNodeByName(ECS_POD_NAME);
      await expect(ecsPodAfterReload.container).toBeVisible();
    });

    test('Hosts OpenTelemetry selection is kept when switching to Pods', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.showHosts();
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_DATA);
      await inventoryPage.selectSchema('OpenTelemetry');
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      for (const pod of SEMCONV_PODS) {
        const waffleNode = await inventoryPage.podWaffleNodeByName(pod.name);
        await expect(waffleNode.container).toBeVisible();
      }
    });

    test('tile menu identity uses k8s.pod.uid on OpenTelemetry', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      const waffleNode = await inventoryPage.podWaffleNodeByName(SEMCONV_POD.name);
      await waffleNode.container.click();

      await expect(inventoryPage.k8sPodWaffleContextMenu).toBeVisible();
      await expect(inventoryPage.k8sPodWaffleContextMenu).toContainText(
        `View details for k8s.pod.uid ${SEMCONV_POD.uid}`
      );

      // LOGS_LOCATOR / ASSET_DETAILS_LOCATOR compress state into `lz=`. Assert
      // uncompressed APM identity and that the other links target the locators.
      await expect(inventoryPage.contextMenuLogsLink).toHaveAttribute('href', /LOGS_LOCATOR/);
      await expect(inventoryPage.contextMenuApmLink).toHaveAttribute(
        'href',
        new RegExp(`k8s\\.pod\\.uid(%3A|:)(%22|")${SEMCONV_POD.uid}`)
      );
      await expect(inventoryPage.contextMenuMetricsLink).toHaveAttribute(
        'href',
        /ASSET_DETAILS_LOCATOR/
      );
    });

    test('tooltip on OpenTelemetry shows a CPU value', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      const waffleNode = await inventoryPage.podWaffleNodeByName(SEMCONV_POD.name);
      await waffleNode.container.hover();

      const tooltip = page.getByTestId(`conditionalTooltipContent-${SEMCONV_POD.name}`);
      await expect(tooltip).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      const cpuValue = tooltip
        .locator('[aria-label^="CPU usage"]')
        .getByTestId('conditionalTooltipContent-value');
      await expect(cpuValue).toHaveText(/\d/);
    });

    test('group by k8s.node.name splits OpenTelemetry pods into two groups', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });
      // Prefer hydrated preferredSchema over DEFAULT_SCHEMA display-only state.
      await expect(page).toHaveURL(/preferredSchema:semconv/);

      await inventoryPage.selectGroupBy('k8s.node.name');
      await expect(
        page.getByTestId('groupNameButton').filter({ hasText: SEMCONV_HOST1_NAME })
      ).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(
        page.getByTestId('groupNameButton').filter({ hasText: SEMCONV_HOST2_NAME })
      ).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    test('table view lists OpenTelemetry pods', async ({ pageObjects: { inventoryPage } }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      await inventoryPage.switchToTableView();
      await expect(inventoryPage.nodesOverviewTable).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      for (const pod of SEMCONV_PODS) {
        await expect(inventoryPage.nodesOverviewTable).toContainText(pod.name);
      }
    });

    test('timeline on OpenTelemetry does not show the anomaly legend', async ({
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      await inventoryPage.toggleTimeline();
      await expect(inventoryPage.timelineContainerOpen).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(inventoryPage.timelineContainerOpen).not.toContainText('Anomaly detected');
    });
  }
);
