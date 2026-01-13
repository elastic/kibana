/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import {
  CONTAINER_NAMES,
  DATE_WITH_DOCKER_DATA,
  DATE_WITH_HOSTS_DATA,
  DATE_WITH_POD_DATA,
  DATE_WITHOUT_DATA,
  HOSTS,
  POD_NAMES,
} from '../../fixtures/constants';

const KUBERNETES_TOUR_STORAGE_KEY = 'isKubernetesTourSeen';

test.use({
  timezoneId: 'GMT',
});

test.describe('Infrastructure Inventory', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
    await browserAuth.loginAsViewer();
    await inventoryPage.goToPage();
    // Dismiss k8s tour if it's present to avoid interference with other test assertions
    // The k8s tour specific test will take care of adding it back during its own execution
    await inventoryPage.dismissK8sTour();
    await inventoryPage.goToTime(DATE_WITH_HOSTS_DATA);
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

  test('Render and dismiss k8s tour', async ({ page, pageObjects: { inventoryPage } }) => {
    await test.step('reset k8s tour seen state', async () => {
      await page.evaluate(
        ([k8sTourStorageKey]) => localStorage.setItem(k8sTourStorageKey, 'false'),
        [KUBERNETES_TOUR_STORAGE_KEY]
      );
      await inventoryPage.reload();
    });

    await test.step('display k8s tour with proper message', async () => {
      await expect(inventoryPage.k8sTourText).toBeVisible();
      await expect(inventoryPage.k8sTourText).toHaveText(
        'Click here to see your infrastructure in different ways, including Kubernetes pods.'
      );
    });

    await test.step('dismiss k8s tour', async () => {
      await inventoryPage.dismissK8sTour();
      await expect(inventoryPage.k8sTourText).toBeHidden();
    });

    await test.step('reload page and verify tour remains dismissed', async () => {
      await inventoryPage.reload();
      await expect(inventoryPage.k8sTourText).toBeHidden();
    });
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

      const podName = POD_NAMES[Math.floor(Math.random() * POD_NAMES.length)];
      const waffleNode = await inventoryPage.getWaffleNode(podName);
      await expect(waffleNode.container).toBeVisible();
      await expect(waffleNode.name).toHaveText(podName);

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

  test('Has no detectable a11y violations on load', async ({ page }) => {
    const { violations } = await page.checkA11y({ include: ['main'] });
    expect(violations).toHaveLength(0);
  });
});
