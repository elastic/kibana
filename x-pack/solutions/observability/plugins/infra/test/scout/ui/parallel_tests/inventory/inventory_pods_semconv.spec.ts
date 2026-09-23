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
  DATE_WITH_POD_DATA,
  DATE_WITH_SEMCONV_DATA,
  DATE_WITH_SEMCONV_POD_DATA,
  EXTENDED_TIMEOUT,
  POD_NAMES,
  SEMCONV_PODS,
} from '../../fixtures/constants';

const SEMCONV_POD = SEMCONV_PODS[0];
const ECS_POD_NAME = POD_NAMES[0];

test.describe(
  'Infrastructure Inventory - Kubernetes Pods OpenTelemetry schema',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': {
          'observability.infra.podSchemaSelectorEnabled': true,
        },
      });
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPage();
    });

    test.afterAll(async ({ apiServices }) => {
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
      await expect(inventoryPage.waffleMap.getByTestId('nodeContainer')).toHaveCount(
        SEMCONV_PODS.length
      );

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
      await expect(inventoryPage.waffleMap.getByTestId('nodeContainer')).toHaveCount(
        SEMCONV_PODS.length
      );

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
      await expect(inventoryPage.schemaSelect).toContainText('Elastic System Integration', {
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page).toHaveURL(/preferredSchema:ecs/);

      const ecsPod = await inventoryPage.podWaffleNodeByName(ECS_POD_NAME);
      await expect(ecsPod.container).toBeVisible();
      await expect(inventoryPage.waffleMap.getByTestId('nodeContainer')).toHaveCount(
        POD_NAMES.length
      );

      for (const pod of SEMCONV_PODS) {
        const waffleNode = await inventoryPage.podWaffleNodeByName(pod.name);
        await expect(waffleNode.container).toHaveCount(0);
      }

      await inventoryPage.reload();
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
      await expect(inventoryPage.waffleMap.getByTestId('nodeContainer')).toHaveCount(
        SEMCONV_PODS.length
      );

      for (const pod of SEMCONV_PODS) {
        const waffleNode = await inventoryPage.podWaffleNodeByName(pod.name);
        await expect(waffleNode.container).toBeVisible();
      }
    });

    test('unavailable schema shows invalid state without rewriting preferredSchema', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.showHosts();
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_DATA);
      await inventoryPage.selectSchema('OpenTelemetry');
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      await inventoryPage.goToTime(DATE_WITH_POD_DATA);
      await inventoryPage.showPods();

      await expect(inventoryPage.schemaSelectorInvalidToken).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(inventoryPage.noDataPrompt).toBeVisible();
      await expect(inventoryPage.noDataSwitchSchemaLink).toBeVisible();
      await expect(page).toHaveURL(/preferredSchema:semconv/);
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

      await expect(inventoryPage.contextMenuLogsLink).toHaveAttribute('href', /k8s\.pod\.uid/);
      await expect(inventoryPage.contextMenuApmLink).toHaveAttribute(
        'href',
        new RegExp(`k8s\\.pod\\.uid(%3A|:)(%22|")${SEMCONV_POD.uid}`)
      );
      await expect(inventoryPage.contextMenuMetricsLink).toHaveAttribute(
        'href',
        new RegExp(`/app/metrics/detail/pod/${encodeURIComponent(SEMCONV_POD.uid)}`)
      );
      await expect(inventoryPage.contextMenuMetricsLink).toHaveAttribute(
        'href',
        /preferredSchema:semconv/
      );
    });
  }
);
