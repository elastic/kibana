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

  // Inventory fetches /internal/apm/services once on mount. Reload to re-fire
  // the request if the row has not aggregated yet.
  public async waitForServiceRow(
    serviceTestId: string,
    { perAttemptTimeoutMs = 30_000, maxRetries = 3 } = {}
  ): Promise<void> {
    const locator = this.page.getByTestId(serviceTestId);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await locator.waitFor({ timeout: perAttemptTimeoutMs });
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await this.page.reload();
      }
    }
  }

  public async assertTransactionExists(): Promise<void> {
    await expect(this.page.getByTestId('apmTransactionDetailLinkLink').first()).toBeVisible();
  }
}
