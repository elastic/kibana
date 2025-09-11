/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class OtelKubernetesOverviewDashboardPage {
  page: Page;

  private readonly metricPanelValues: Locator;

  constructor(page: Page) {
    this.page = page;

    this.metricPanelValues = this.page.locator(`[id^=panel] .echMetricText__value`);
  }

  async assertNodesPanelNotEmpty() {
    await expect(this.metricPanelValues.first()).toBeVisible();
    expect(await this.metricPanelValues.first().textContent()).toMatch(/\d+/);
  }
}
