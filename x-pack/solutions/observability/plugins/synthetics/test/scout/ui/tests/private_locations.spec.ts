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
  const FLEET_POLICY_NAME = 'Test fleet policy';
  let locationId: string;

  test.beforeAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deletePrivateLocations();
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.deleteSyntheticsIntegrations();
    await syntheticsServices.createFleetAgentPolicy(FLEET_POLICY_NAME);
  });

  test.afterAll(async ({ syntheticsServices }) => {
    await syntheticsServices.deleteMonitors();
    await syntheticsServices.deleteSyntheticsIntegrations();
    await syntheticsServices.deletePrivateLocations();
  });

  test('manages private locations lifecycle', async ({
    pageObjects,
    page,
    browserAuth,
    syntheticsServices,
  }) => {
    await test.step('login and navigate to settings', async () => {
      await browserAuth.loginAsAdmin();
      await pageObjects.syntheticsApp.navigateToSettings();
    });

    await test.step('create private location', async () => {
      await pageObjects.syntheticsApp.navigateToSettingsTab('Private Locations');
      await pageObjects.syntheticsApp.createPrivateLocation({
        name: 'Test private',
        agentPolicy: FLEET_POLICY_NAME,
        tags: ['Basement', 'Area51'],
      });
    });

    await test.step('verify and assign monitor', async () => {
      await pageObjects.syntheticsApp.navigateToSettingsTab('Private Locations');
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
      await pageObjects.syntheticsApp.navigateToFleetIntegrationPolicies();
      await page.click(`text="test-monitor-${NEW_LOCATION_LABEL}-default"`);
      // there is "ghost" element with the same locator, so we need to specify the first one
      // eslint-disable-next-line playwright/no-nth-methods
      await expect(page.testSubj.locator('syntheticsManagedPolicyCallout').first()).toBeVisible();
    });

    await test.step('edit button leads to Synthetics edit page', async () => {
      await page.click('text="Edit in Synthetics"');
      await expect(page.getByRole('heading', { name: 'Edit Monitor' })).toBeVisible();
      await expect(page.testSubj.locator('syntheticsMonitorConfigName')).toHaveValue(
        'test-monitor'
      );
    });

    await test.step('location cannot be deleted with assigned monitor', async () => {
      await page.testSubj.click('settings-page-link');
      await pageObjects.syntheticsApp.navigateToSettingsTab('Private Locations');
      await expect(page.locator(`td:has-text("${NEW_LOCATION_LABEL}")`)).toBeVisible();
      await expect(page.locator(`[data-test-subj="deleteLocation-${locationId}"]`)).toBeDisabled();
    });

    await test.step('delete location after removing monitor', async () => {
      await syntheticsServices.deleteMonitors();
      await pageObjects.syntheticsApp.navigateToSettingsTab('Data Retention');
      await pageObjects.syntheticsApp.navigateToSettingsTab('Private Locations');
      await pageObjects.syntheticsApp.deleteLocation();
      await expect(page.getByText('Create your first private location')).toBeVisible();
    });

    await test.step('viewer cannot create locations', async () => {
      await browserAuth.loginAsViewer();
      await pageObjects.syntheticsApp.navigateToSettings();
      await pageObjects.syntheticsApp.navigateToSettingsTab('Private Locations');
      const createBtn = page.getByRole('button', { name: 'Create location' });
      await expect(createBtn).toBeDisabled();
    });
  });
});
