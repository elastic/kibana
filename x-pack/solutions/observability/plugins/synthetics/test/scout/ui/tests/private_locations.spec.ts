/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';

test.describe('PrivateLocationsSettings', { tag: tags.stateful.classic }, () => {
  const NEW_LOCATION_LABEL = 'Updated Test Location';
  let locationId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deletePrivateLocations();
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.deleteSyntheticsIntegrations();
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deletePrivateLocations();
    await syntheticsServices.deleteMonitors();
  });

  test('manages private locations lifecycle', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
    kbnUrl,
  }) => {
    await test.step('login and navigate to settings', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToSettings();
    });

    await test.step('create agent policy', async () => {
      await page.click('text=Private Locations');
      await page.click('text=No agent policies found');
      await page.click('text=Create agent policy');
      await page.fill('[placeholder="Choose a name"]', 'Test fleet policy');
      await page.click('text=Collect system logs and metrics');
      await page.click('div[role="dialog"] button:has-text("Create agent policy")');
      await page.waitForTimeout(5_000);
      await pageObjects.syntheticsApp.waitForLoadingToFinish();
    });

    await test.step('create private location', async () => {
      await pageObjects.syntheticsApp.navigateToSettings();
      await page.click('text=Private Locations');
      await page.click('button:has-text("Create location")');
      await page.testSubj.fill('syntheticsLocationFormFieldText', 'Test private');
      await page.click('[aria-label="Select agent policy"]');
      await page.click('button[role="option"]:has-text("Test fleet policyAgents: 0")');
      await page.click('.euiComboBox__inputWrap');
      await page.fill('[aria-label="Tags"]', 'Basement');
      await page.press('[aria-label="Tags"]', 'Enter');
      await page.fill('[aria-label="Tags"]', 'Area51');
      await page.press('[aria-label="Tags"]', 'Enter');
      await page.click('button:has-text("Save")');
    });

    await test.step('verify and assign monitor', async () => {
      await page.click('text=Private Locations');
      const privateLocations = await syntheticsServices.getPrivateLocations();
      expect(privateLocations).toHaveLength(1);
      locationId = privateLocations[0].id;
      await syntheticsServices.addMonitorSimple('test-monitor', {
        locations: [privateLocations[0]],
        type: 'browser',
      });
    });

    await test.step('edit location label and verify disabled fields', async () => {
      await page.testSubj.click('action-edit');
      await expect(page.locator('[aria-label="Select agent policy"]')).toBeDisabled();
      await expect(page.locator('[aria-label="Tags"]')).toBeEnabled();
      await expect(page.locator('[aria-label="Spaces "]')).toBeDisabled();
      await page.testSubj.fill('syntheticsLocationFormFieldText', NEW_LOCATION_LABEL);
      await page.testSubj.click('syntheticsLocationFlyoutSaveButton');
      await expect(page.locator(`td:has-text("${NEW_LOCATION_LABEL}")`)).toBeVisible();
    });

    await test.step('verify Fleet integration', async () => {
      await page.goto(kbnUrl.get('/app/integrations/detail/synthetics/policies'));
      await expect(page.getByText('Elastic Synthetics')).toBeVisible();
      await page.click(`text="test-monitor-${NEW_LOCATION_LABEL}-default"`);
      await expect(
        page.getByText('This package policy is managed by the Synthetics app.')
      ).toBeVisible();
    });

    await test.step('edit button leads to Synthetics edit page', async () => {
      await page.click('text="Edit in Synthetics"');
      await expect(page.getByText('Edit Monitor')).toBeVisible();
      await expect(page.testSubj.locator('syntheticsMonitorConfigName')).toHaveValue(
        'test-monitor'
      );
    });

    await test.step('location cannot be deleted with assigned monitor', async () => {
      await page.testSubj.click('settings-page-link');
      await page.click('text=Private Locations');
      await expect(page.locator(`td:has-text("${NEW_LOCATION_LABEL}")`)).toBeVisible();
      await expect(page.locator(`[data-test-subj="deleteLocation-${locationId}"]`)).toBeDisabled();
    });

    await test.step('delete location after removing monitor', async () => {
      await syntheticsServices.deleteMonitors();
      await page.click('text=Data Retention');
      await page.click('text=Private Locations');
      await page.click('[aria-label="Delete location"]');
      await page.click('button:has-text("Delete location")');
      await expect(page.getByText('Create your first private location')).toBeVisible();
    });

    await test.step('viewer cannot create locations', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToSettings();
      await page.click('text=Private Locations');
      const createBtn = page.getByRole('button', { name: 'Create location' });
      await expect(createBtn).toBeDisabled();
    });
  });
});
