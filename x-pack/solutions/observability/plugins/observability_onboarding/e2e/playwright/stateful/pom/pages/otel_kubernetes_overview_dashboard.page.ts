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
    // The dashboard may not auto-refresh if its saved state has refresh disabled.
    // Reload periodically to trigger fresh Elasticsearch queries until a numeric
    // value appears in a metric panel.
    await expect(async () => {
      await this.page.reload();
      await expect(this.metricPanelValues.first()).toHaveText(/\d+/, { timeout: 30_000 });
    }).toPass({ timeout: 10 * 60_000 });
  }
}
