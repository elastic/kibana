/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class HostsOverviewPage {
  page: Page;

  private readonly cpuPercentageValue: Locator;

  constructor(page: Page) {
    this.page = page;

    this.cpuPercentageValue = this.page
      .getByTestId('infraAssetDetailsKPIcpuUsage')
      .locator('.echMetricText__value');
  }

  public async assertCpuPercentageNotEmpty() {
    await expect(this.cpuPercentageValue).toBeVisible();
    expect(await this.cpuPercentageValue.textContent()).toMatch(/\d+%$/);
  }

  public async assertHostCpuNotEmpty(hostname: string) {
    const hostRow = this.page
      .locator('[data-test-subj="hostsView-tableRow"]')
      .filter({ hasText: hostname });

    await expect(hostRow).toBeVisible();

    const cpuCell = hostRow.locator('[data-test-subj="hostsView-tableRow-cpuUsage"]');
    await expect(cpuCell).toBeVisible();

    // Get the first child element which contains the actual value (not the separator)
    const cpuValue = cpuCell.locator('> div').first();
    const cpuText = await cpuValue.textContent();
    expect(cpuText).toMatch(/\d+(\.\d+)?%$/);
  }
}
