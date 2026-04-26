/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page } from '@playwright/test';

export class ApmServiceInventoryPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Inventory fetches /internal/apm/services once on mount with no auto-refetch; reload to re-fire if the row hasn't aggregated yet.
  public async waitForServiceRow(
    serviceTestId: string,
    { perAttemptTimeoutMs = 30_000, maxReloads = 3 } = {}
  ) {
    const locator = this.page.getByTestId(serviceTestId);
    for (let attempt = 0; attempt <= maxReloads; attempt++) {
      try {
        await locator.waitFor({ timeout: perAttemptTimeoutMs });
        return;
      } catch (err) {
        if (attempt === maxReloads) throw err;
        await this.page.reload();
      }
    }
  }

  public async assertTransactionExists() {
    await expect(this.page.getByTestId('apmTransactionDetailLinkLink').first()).toBeVisible();
  }
}
