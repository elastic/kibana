/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class OtelKubernetesOverviewDashboardPage {
  page: Page;

  private readonly nodesPanelValue: Locator;

  constructor(page: Page) {
    this.page = page;

    this.nodesPanelValue = this.page.locator(`[id^=panel] .echMetricText__value`);
  }

  async assertNodesPanelNotEmpty() {
    await expect(this.nodesPanelValue.first()).toBeVisible();
    expect(await this.nodesPanelValue.first().textContent()).toMatch(/\d+/);
  }
}
