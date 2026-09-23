/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  euiSelectors,
  spaceTest,
  tags,
  CUSTOM_QUERY_RULE,
  FULL_KIBANA_SECURITY_ROLE,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe('Run workflow alert action', { tag: [...tags.stateful.classic] }, () => {
  let ruleName: string;

  spaceTest.beforeAll(async ({ scoutSpace, kbnClient }) => {
    // Enable the Workflows UI feature flag required for the "Run workflow" action to appear
    await scoutSpace.uiSettings.set({ 'workflows:ui:enabled': true });

    // The StorageIndexAdapter for the workflows management plugin creates the
    // .workflows* index template and backing index lazily on the first write.
    // That cold-start takes >10 s under the 2-worker parallel config, which
    // exceeds Scout's 10 s actionTimeout when the first write happens inside a
    // test body via page.request.post().  Create and immediately delete a
    // throwaway workflow here, where the 3-minute beforeAll budget and the
    // undici-based kbnClient (no per-request deadline) absorb the latency.
    const warmupYaml = [
      "version: '1'",
      `name: '__warmup_${Date.now()}__'`,
      'enabled: false',
      'triggers:',
      '  - type: alert',
      'steps:',
      '  - name: log',
      '    type: console',
      '    with:',
      "      message: 'warmup'",
    ].join('\n');
    const warmupResponse = await kbnClient.request<{ id: string }>({
      method: 'POST',
      path: `/s/${scoutSpace.id}/api/workflows/workflow`,
      body: { yaml: warmupYaml },
    });
    await kbnClient.request({
      method: 'DELETE',
      path: `/s/${scoutSpace.id}/api/workflows/workflow/${warmupResponse.data.id}`,
      ignoreErrors: [404],
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
    ruleName = `${CUSTOM_QUERY_RULE.name}_${scoutSpace.id}_${Date.now()}`;
    await apiServices.detectionRule.createCustomQueryRule({
      ...CUSTOM_QUERY_RULE,
      name: ruleName,
    });
    // Use a custom role that includes workflowsManagement privileges (canExecuteWorkflow)
    // in addition to the security index privileges needed to view alerts
    await browserAuth.loginWithCustomRole(FULL_KIBANA_SECURITY_ROLE);
  });

  spaceTest.afterEach(async ({ apiServices }) => {
    await apiServices.detectionRule.deleteAll();
    await apiServices.detectionAlerts.deleteAll();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('workflows:ui:enabled');
  });

  spaceTest(
    'should show success toast with workflow link and open workflows app in new tab after executing',
    async ({ pageObjects, page, kbnUrl, scoutSpace }) => {
      const { alertsTablePage } = pageObjects;

      // Create a minimal alert-triggered workflow via REST API in the current space
      const workflowName = `Scout E2E Test Workflow ${Date.now()}`;
      const workflowYaml = [
        "version: '1'",
        `name: '${workflowName}'`,
        'enabled: true',
        'triggers:',
        '  - type: alert',
        'steps:',
        '  - name: log',
        '    type: console',
        '    with:',
        "      message: 'Alert received'",
      ].join('\n');

      const createResponse = await page.request.post(
        kbnUrl.get(`/s/${scoutSpace.id}/api/workflows/workflow`),
        {
          data: { yaml: workflowYaml },
          headers: { 'kbn-xsrf': 'true' },
        }
      );
      const { id: workflowId } = await createResponse.json();

      try {
        await alertsTablePage.navigate();
        await alertsTablePage.waitForDetectionsAlertsWrapper();
        await alertsTablePage.openAlertContextMenu(ruleName);
        await alertsTablePage.runWorkflowMenuItem.click();

        await expect(alertsTablePage.workflowPanel).toBeVisible();

        // Select the created workflow from the list. The workflow selector renders a
        // secondary description alongside the name inside the option's label element,
        // which breaks selectOption()'s exact-label match, so filter on options instead.
        await page.components
          .selectable('workflowIdSelect')
          .options.filter({ hasText: workflowName })
          .click();

        await expect(alertsTablePage.executeWorkflowButton).toBeEnabled();
        await alertsTablePage.executeWorkflowButton.click();

        // Assert the success toast appears
        await expect(page.getByTestId('euiToastHeader__title')).toHaveText(
          'Workflow successfully started'
        );

        // Assert the "View workflow execution" link button is present in the toast
        const viewExecutionButton = page
          .locator(euiSelectors.toast.TOAST_SELECTOR)
          .getByRole('button', { name: 'View workflow execution' });
        await expect(viewExecutionButton).toBeVisible();

        // Clicking it should open the workflows app in a new tab
        const [newTab] = await Promise.all([
          page.context().waitForEvent('page'),
          viewExecutionButton.click(),
        ]);
        await expect(newTab).toHaveURL(/\/app\/workflows/);
      } finally {
        await page.request.delete(
          kbnUrl.get(`/s/${scoutSpace.id}/api/workflows/workflow/${workflowId}`),
          { headers: { 'kbn-xsrf': 'true' } }
        );
      }
    }
  );

  spaceTest(
    'should open the workflow selection panel when Run workflow is clicked',
    async ({ pageObjects }) => {
      const { alertsTablePage } = pageObjects;

      await alertsTablePage.navigate();
      await alertsTablePage.waitForDetectionsAlertsWrapper();
      await alertsTablePage.openAlertContextMenu(ruleName);

      await expect(alertsTablePage.runWorkflowMenuItem).toBeVisible();
      await alertsTablePage.runWorkflowMenuItem.click();

      await expect(alertsTablePage.workflowPanel).toBeVisible();
      await expect(alertsTablePage.executeWorkflowButton).toBeVisible();
      await expect(alertsTablePage.executeWorkflowButton).toBeDisabled();
    }
  );

  spaceTest(
    'should show Run workflow action in bulk actions and open the bulk panel',
    async ({ pageObjects }) => {
      const { alertsTablePage } = pageObjects;

      await alertsTablePage.navigate();
      await alertsTablePage.waitForDetectionsAlertsWrapper();

      // Select the alert row matching the rule via its checkbox
      const ruleNameCell = alertsTablePage.alertsTable
        .getByTestId('ruleName')
        .filter({ hasText: ruleName });
      const alertCheckbox = ruleNameCell
        .locator('xpath=ancestor::div[contains(@class,"euiDataGridRow")]')
        .locator('.euiCheckbox__input');
      await alertCheckbox.check();

      // Open the bulk-actions popover ("N selected" button) before clicking the menu item
      await alertsTablePage.selectedShowBulkActionsButton.click();

      await alertsTablePage.bulkRunWorkflowMenuItem.click();

      await expect(alertsTablePage.bulkWorkflowPanel).toBeVisible();
    }
  );
});
