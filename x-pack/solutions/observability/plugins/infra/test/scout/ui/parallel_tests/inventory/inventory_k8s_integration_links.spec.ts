/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { DATE_WITH_POD_DATA } from '../../fixtures/constants';

const KUBERNETES_PACKAGE_NAME = 'kubernetes';

test.describe.serial(
  'Infrastructure Inventory - K8s Integration Links Navigation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ log, apiServices }) => {
      // Start with a clean state - ensure kubernetes is NOT installed
      log.info(`Ensuring ${KUBERNETES_PACKAGE_NAME} integration is not installed...`);
      await apiServices.fleet.integration.delete(KUBERNETES_PACKAGE_NAME);
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { inventoryPage } }) => {
      await browserAuth.loginAsViewer();
      await inventoryPage.addDismissK8sTourInitScript();
      await inventoryPage.addClearK8sCardDismissedInitScript();
      await inventoryPage.goToPage();
    });

    test.afterAll(async ({ log, apiServices }) => {
      // Cleanup - remove kubernetes integration
      log.info(`Cleaning up ${KUBERNETES_PACKAGE_NAME} integration...`);
      await apiServices.fleet.integration.delete(KUBERNETES_PACKAGE_NAME);
    });

    test('K8s integration link navigates to integrations detail page', async ({
      pageObjects: { inventoryPage },
      page,
    }) => {
      await test.step('switch to K8s pods view', async () => {
        await inventoryPage.goToTime(DATE_WITH_POD_DATA);
        await inventoryPage.showPods();
        await expect(inventoryPage.inventorySwitcherButton).toContainText('Kubernetes Pods');
      });

      await test.step('click integration link and verify navigation', async () => {
        const installLink = page.getByTestId('infraKubernetesDashboardCardInstallLink');
        await expect(installLink).toBeVisible();
        await installLink.click();

        // Should navigate to integrations detail page for kubernetes
        await expect(page).toHaveURL(/integrations.*kubernetes/);
      });
    });

    test('K8s dashboards link navigates to dashboards with tag filter', async ({
      pageObjects: { inventoryPage },
      page,
      kbnClient,
      log,
    }) => {
      await test.step('install kubernetes integration from registry', async () => {
        log.info(`Installing ${KUBERNETES_PACKAGE_NAME} integration package from registry...`);
        await kbnClient.request({
          method: 'POST',
          path: `/api/fleet/epm/packages/${KUBERNETES_PACKAGE_NAME}`,
          body: { force: true },
        });
        log.info(`${KUBERNETES_PACKAGE_NAME} integration package installed`);
      });

      await test.step('switch to K8s pods view', async () => {
        await inventoryPage.goToTime(DATE_WITH_POD_DATA);
        await inventoryPage.showPods();
        await expect(inventoryPage.inventorySwitcherButton).toContainText('Kubernetes Pods');
      });

      await test.step('click dashboards link and verify navigation', async () => {
        const dashboardLink = page.getByTestId('infraKubernetesDashboardCardLink');
        await expect(dashboardLink).toBeVisible();
        await dashboardLink.click();

        // Should navigate to dashboards app with Kubernetes tag filter
        await expect(page).toHaveURL(/dashboards.*tag:\(Kubernetes\)/);
      });
    });
  }
);
