/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page } from '@playwright/test';

export class DiscoverValidationPage {
  constructor(private page: Page) {}

  async waitForDiscoverToLoad() {
    await this.page.waitForLoadState('networkidle');

    // Wait for the histogram component to be fully rendered
    await this.page.getByTestId('unifiedHistogramRendered').waitFor({
      timeout: 60000,
      state: 'visible',
    });
  }

  /**
   * Asserts that log data is present in Discover.
   * Checks for either histogram chart or query hits indicator.
   */
  async assertHasAnyLogData() {
    const histogramExists = await this.page.getByTestId('unifiedHistogramChart').isVisible();
    const queryHitsExists = await this.page.getByTestId('discoverQueryHits').isVisible();

    expect(
      histogramExists || queryHitsExists,
      'Expected to find log data in Discover. Neither histogram chart nor query hits indicator was found. ' +
        'This indicates that no log data was successfully ingested or the Discover app failed to load properly.'
    ).toBe(true);
  }
}
