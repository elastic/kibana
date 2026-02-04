/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import {
  CONTAINER_NAMES,
  DATE_WITH_DOCKER_DATA,
  DATE_WITH_HOSTS_DATA,
  DATE_WITH_POD_DATA,
  DATE_WITHOUT_DATA,
  HOST1_NAME,
  HOST2_NAME,
  HOST3_NAME,
  HOST4_NAME,
  HOST5_NAME,
  HOST6_NAME,
  HOSTS,
  POD_COUNT,
  POD_NAMES,
} from '../../fixtures/constants';

const POD_NAME = POD_NAMES[POD_COUNT - 1];

test.describe('Infrastructure Inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await inventoryPage.addDismissK8sTourInitScript();
    await inventoryPage.goToPage();
  });

  test('Render expected content', async ({ page, pageObjects: { inventoryPage } }) => {
    await test.step('set the correct browser page title', async () => {
      const title = await page.title();
      expect(title).toBe('Infrastructure inventory - Infrastructure - Observability - Elastic');
    });

    await test.step('display inventory survey link', async () => {
      await expect(inventoryPage.feedbackLink).toBeVisible();
    });

    await test.step('display waffle map', async () => {
      await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
      await expect(inventoryPage.mapViewButton).toHaveAttribute('aria-pressed', 'true');
      await expect(inventoryPage.waffleMap).toBeVisible();
    });

    await test.step('open and close timeline', async () => {
      await inventoryPage.toggleTimeline();
      await expect(inventoryPage.timelineContainerOpen).toBeVisible();
      await inventoryPage.toggleTimeline();
      await expect(inventoryPage.timelineContainerClosed).toBeVisible();
    });

    await test.step('switch to table view and display inventory table', async () => {
      await inventoryPage.switchToTableView();
      await expect(inventoryPage.tableViewButton).toHaveAttribute('aria-pressed', 'true');
      await expect(inventoryPage.nodesOverviewTable).toBeVisible();
    });
  });

  test('Filter nodes by query bar', async ({ pageObjects: { inventoryPage } }) => {
    await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
    await inventoryPage.filterByQueryBar(`host.name: "${HOST1_NAME}"`);

    await expect(inventoryPage.waffleMap.getByTestId('nodeContainer')).toHaveCount(1);

    const host1Node = await inventoryPage.getWaffleNode(HOST1_NAME);
    await expect(host1Node.container).toBeVisible();
  });

  test('Render empty data prompt for dates with no data', async ({
    pageObjects: { inventoryPage },
  }) => {
    await test.step('go to a date with no data', async () => {
      await inventoryPage.goToTime(DATE_WITHOUT_DATA);
      await expect(inventoryPage.datePickerInput).toHaveValue(DATE_WITHOUT_DATA);
    });

    await test.step('map view displays empty data prompt', async () => {
      await expect(inventoryPage.mapViewButton).toHaveAttribute('aria-pressed', 'true');
      await expect(inventoryPage.noDataPrompt).toBeVisible();
    });

    await test.step('switch to table view and display empty data prompt', async () => {
      await inventoryPage.switchToTableView();
      await expect(inventoryPage.tableViewButton).toHaveAttribute('aria-pressed', 'true');
      await expect(inventoryPage.noDataPrompt).toBeVisible();
    });
  });

  test('Inventory switcher changes node types', async ({ pageObjects: { inventoryPage } }) => {
    await test.step('show hosts by default', async () => {
      await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
      await expect(inventoryPage.inventorySwitcherButton).toContainText('Hosts');

      const hostName = HOSTS[Math.floor(Math.random() * HOSTS.length)].hostName;
      const waffleNode = await inventoryPage.getWaffleNode(hostName);
      await expect(waffleNode.container).toBeVisible();
      await expect(waffleNode.name).toHaveText(hostName);
    });

    await test.step('switch to k8s pods', async () => {
      await inventoryPage.goToTime(DATE_WITH_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.inventorySwitcherButton).toContainText('Kubernetes Pods');

      const waffleNode = await inventoryPage.getWaffleNode(POD_NAME);
      await expect(waffleNode.container).toBeVisible();
      await expect(waffleNode.name).toHaveText(POD_NAME);

      await expect(inventoryPage.k8sFeedbackLink).toBeVisible();
    });

    await test.step('switch to containers', async () => {
      await inventoryPage.goToTime(DATE_WITH_DOCKER_DATA);
      await inventoryPage.showContainers();
      await expect(inventoryPage.inventorySwitcherButton).toContainText('Docker Containers');

      const containerName = CONTAINER_NAMES[Math.floor(Math.random() * CONTAINER_NAMES.length)];
      const waffleNode = await inventoryPage.getWaffleNode(containerName);
      await expect(waffleNode.container).toBeVisible();
      await expect(waffleNode.name).toHaveText(containerName);
    });
  });

  test('K8s pods waffle map node redirects to pod details page', async ({
    page,
    pageObjects: { inventoryPage },
  }) => {
    await test.step('switch to k8s pods', async () => {
      await inventoryPage.goToTime(DATE_WITH_POD_DATA);
      await inventoryPage.showPods();
      await expect(inventoryPage.inventorySwitcherButton).toContainText('Kubernetes Pods');
    });

    await test.step('open pod waffle context menu', async () => {
      const waffleNode = await inventoryPage.getWaffleNode(POD_NAME);
      await waffleNode.container.click();

      await expect(inventoryPage.k8sPodWaffleContextMenu).toBeVisible();
      await expect(inventoryPage.k8sPodWaffleContextMenu).toContainText(
        `View details for kubernetes.pod.uid ${POD_NAME}`
      );
    });

    await test.step('click pod details link and verify redirection', async () => {
      await inventoryPage.k8sPodWaffleContextMenu
        .getByRole('link', {
          name: 'Kubernetes Pod metrics',
        })
        .click();

      const url = new URL(page.url());

      expect(url.pathname).toBe(`/app/metrics/detail/pod/${encodeURIComponent(POD_NAME)}`);
    });
  });

  test('Change waffle map color palette', async ({ pageObjects: { inventoryPage } }) => {
    await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);

    await test.step('select "positive" palette and verify colors', async () => {
      await inventoryPage.selectPalette('positive');

      const nodesWithValues = [
        { name: HOST6_NAME, color: '#b1e4d1' },
        { name: HOST5_NAME, color: '#e5f4f1' },
        { name: HOST4_NAME, color: '#c3eadb' },
        { name: HOST3_NAME, color: '#24c292' },
        { name: HOST2_NAME, color: '#62cea6' },
        { name: HOST1_NAME, color: '#8cd9bb' },
      ];

      for (const node of nodesWithValues) {
        const waffleNode = await inventoryPage.getWaffleNode(node.name);
        await expect(waffleNode.name).toHaveAttribute('color', node.color);
      }
    });

    await test.step('change palette to "temperature" and verify colors', async () => {
      await inventoryPage.selectPalette('temperature');

      const nodesWithValues = [
        { name: HOST6_NAME, color: '#dbe9ff' },
        { name: HOST5_NAME, color: '#61a2ff' },
        { name: HOST4_NAME, color: '#b5d2ff' },
        { name: HOST3_NAME, color: '#f6726a' },
        { name: HOST2_NAME, color: '#ffbab3' },
        { name: HOST1_NAME, color: '#fbefee' },
      ];

      for (const node of nodesWithValues) {
        const waffleNode = await inventoryPage.getWaffleNode(node.name);
        await expect(waffleNode.name).toHaveAttribute('color', node.color);
      }
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { inventoryPage },
  }) => {
    await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
    const { violations } = await page.checkA11y({ include: ['main'] });
    expect(violations).toHaveLength(0);
  });
});
