/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import {
  profilingCo2PerKWH,
  profilingDatacenterPUE,
  profilingPervCPUWattX86,
} from '@kbn/observability-plugin/common';
import { test } from '../../fixtures';

test.describe('Settings page', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('opens setting page', async ({ pageObjects: { profilingSettingsPage } }) => {
    await profilingSettingsPage.goto();
    await expect(profilingSettingsPage.page.getByText('Advanced Settings')).toBeVisible();
    await expect(profilingSettingsPage.page.getByText('Custom CO2 settings')).toBeVisible();
    await expect(
      profilingSettingsPage.page.getByText('Regional Carbon Intensity (ton/kWh)')
    ).toBeVisible();
    await expect(
      profilingSettingsPage.page.getByRole('heading', { name: 'Data Center PUE' })
    ).toBeVisible();
    await expect(profilingSettingsPage.page.getByText('Per vCPU Watts - x86')).toBeVisible();
    await expect(profilingSettingsPage.page.getByText('Per vCPU Watts - arm64')).toBeVisible();
    await expect(profilingSettingsPage.page.getByText('AWS EDP discount rate (%)')).toBeVisible();
    await expect(profilingSettingsPage.page.getByText('Cost per vCPU per hour ($)')).toBeVisible();
    await expect(profilingSettingsPage.page.getByText('Azure discount rate (%)')).toBeVisible();
    await expect(
      profilingSettingsPage.page.getByRole('heading', {
        name: 'Show error frames in the Universal Profiling views',
      })
    ).toBeVisible();
  });

  test('updates values', async ({ pageObjects: { profilingSettingsPage } }) => {
    await profilingSettingsPage.goto();
    await expect(profilingSettingsPage.page.getByText('Advanced Settings')).toBeVisible();

    const co2Field = profilingSettingsPage.page.getByTestId(
      `management-settings-editField-${profilingCo2PerKWH}`
    );
    await co2Field.clear();
    await co2Field.fill('0.12345');

    const pueField = profilingSettingsPage.page.getByTestId(
      `management-settings-editField-${profilingDatacenterPUE}`
    );
    await pueField.clear();
    await pueField.fill('2.4');

    const wattField = profilingSettingsPage.page.getByTestId(
      `management-settings-editField-${profilingPervCPUWattX86}`
    );
    await wattField.clear();
    await wattField.fill('20');

    // Verify the values were updated by checking the field values
    await expect(co2Field).toHaveValue('0.12345');
    await expect(pueField).toHaveValue('2.4');
    await expect(wattField).toHaveValue('20');
  });
});
