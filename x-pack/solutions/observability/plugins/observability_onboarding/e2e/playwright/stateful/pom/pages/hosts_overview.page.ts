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
}
