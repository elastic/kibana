/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class StreamsValidationPage {
  private readonly streamsTable: Locator;

  constructor(private page: Page) {
    this.streamsTable = this.page.getByTestId('streamsTable');
  }

  async waitForStreamsToLoad() {
    await this.streamsTable.waitFor({ state: 'visible', timeout: 60000 });
  }

  async assertStreamDocCountGreaterThanZero(streamName: string) {
    const docCount = this.page.locator(`[data-test-subj="streamsDocCount-${streamName}"]`);
    await docCount.waitFor({ state: 'visible', timeout: 60000 });

    const docCountText = (await docCount.textContent()) ?? '';
    const match = docCountText.match(/[\d,]+/);
    const count = parseInt((match?.[0] ?? '0').replace(/,/g, ''), 10);

    expect(count, `Expected ${streamName} doc count > 0, got "${docCountText}"`).toBeGreaterThan(0);
  }
}
