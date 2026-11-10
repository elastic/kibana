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
  DATE_WITH_POD_DATA,
  DATE_WITH_SEMCONV_DATA,
  DATE_WITH_SEMCONV_POD_DATA,
  EXTENDED_TIMEOUT,
  POD_NAMES,
  SEMCONV_HOST1_NAME,
  SEMCONV_PODS,
} from '../../fixtures/constants';
import {
  cleanInventoryPodsSemconvSynthtraceData,
  ingestInventoryPodsSemconvSynthtraceData,
} from '../../fixtures/sequential_pods_synthtrace';

const SEMCONV_POD = SEMCONV_PODS[0];
const ECS_POD_NAME = POD_NAMES[0];

test.describe(
  'Pod Metric Detail - OpenTelemetry kubeletstats',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // Sequential project (`playwright.config.ts` / `testDir: './tests'`). Sequential
    // specs also do not run `parallel_tests/global.setup.ts`.
    test.beforeAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: ingesting pod metric detail SemConv fixtures');
      await ingestInventoryPodsSemconvSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.goToPage();
    });

    test.afterAll(async ({ esClient, kbnUrl, log, config }) => {
      log.info('Sequential suite: cleaning pod metric detail SemConv fixtures');
      await cleanInventoryPodsSemconvSynthtraceData({ esClient, kbnUrl, log, config });
    });

    test('opens kubeletstats charts from an OpenTelemetry tile', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      const waffleNode = await inventoryPage.podWaffleNodeByName(SEMCONV_POD.name);
      await waffleNode.container.click();
      await expect(inventoryPage.contextMenuMetricsLink).toBeVisible();

      const metadataRequest = page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().includes('/api/infra/metadata')
      );
      const nodeDetailsRequest = page.waitForRequest(
        (request) =>
          request.method() === 'POST' && request.url().includes('/api/metrics/node_details')
      );

      await inventoryPage.contextMenuMetricsLink.click();

      await expect(page).toHaveURL(new RegExp(`/app/metrics/detail/pod/${SEMCONV_POD.uid}`));
      await expect(page.getByText('Pod Overview')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await expect(page.getByRole('heading', { name: SEMCONV_POD.name })).toBeVisible();

      const metadata = await metadataRequest;
      expect(metadata.postDataJSON()).toMatchObject({
        nodeId: SEMCONV_POD.uid,
        nodeType: 'pod',
        schema: 'semconv',
      });

      const nodeDetails = await nodeDetailsRequest;
      expect(nodeDetails.postDataJSON()).toMatchObject({
        nodeId: SEMCONV_POD.uid,
        nodeType: 'pod',
        schema: 'semconv',
      });
    });

    test('shows the node metadata resolved from the OpenTelemetry host record', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      // `DATE_WITH_SEMCONV_DATA` is the only window that also carries semconv host documents, and
      // the pod metadata strip is resolved through `k8s.node.name` -> the host record.
      await inventoryPage.goToTime(DATE_WITH_SEMCONV_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.schemaSelect).toContainText('OpenTelemetry', {
        timeout: EXTENDED_TIMEOUT,
      });

      const waffleNode = await inventoryPage.podWaffleNodeByName(SEMCONV_POD.name);
      await waffleNode.container.click();
      await expect(inventoryPage.contextMenuMetricsLink).toBeVisible();
      await inventoryPage.contextMenuMetricsLink.click();

      await expect(page).toHaveURL(new RegExp(`/app/metrics/detail/pod/${SEMCONV_POD.uid}`));

      const item = (field: string) => page.testSubj.locator(`infraMetadataDetailsItem-${field}`);

      await expect(item('cloud.provider')).toContainText('aws', { timeout: EXTENDED_TIMEOUT });
      // `cloud.instance.id` is absent on OpenTelemetry data; `cloud.resource_id` carries it.
      await expect(item('cloud.instance.id')).toContainText(`instance-${SEMCONV_HOST1_NAME}`);
      await expect(item('host.os.name')).toContainText('linux');
      // No semantic conventions attribute maps to `host.os.kernel`.
      await expect(item('host.os.kernel')).toContainText('--');
    });

    test('keeps an Elastic Common Schema tile off the kubeletstats request', async ({
      page,
      pageObjects: { inventoryPage },
    }) => {
      await inventoryPage.goToTime(DATE_WITH_POD_DATA);
      await inventoryPage.showPods();
      // A prior OpenTelemetry selection would hide ECS-only pods at this time range.
      await inventoryPage.selectSchema('Elastic System Integration');
      await inventoryPage.goToTime(DATE_WITH_POD_DATA);

      const waffleNode = await inventoryPage.podWaffleNodeByName(ECS_POD_NAME);
      await waffleNode.container.click();

      const metadataRequest = page.waitForRequest(
        (request) => request.method() === 'POST' && request.url().includes('/api/infra/metadata')
      );
      await inventoryPage.contextMenuMetricsLink.click();

      await expect(page).toHaveURL(new RegExp(`/app/metrics/detail/pod/${ECS_POD_NAME}`));
      const metadata = await metadataRequest;
      expect(metadata.postDataJSON().schema).toBeUndefined();
    });
  }
);
