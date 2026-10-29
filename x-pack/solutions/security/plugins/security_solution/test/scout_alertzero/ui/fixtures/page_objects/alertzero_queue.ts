/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

export class AlertZeroQueuePage {
  public readonly trendChartRow: Locator;
  public readonly trendChartCards: Locator;
  public readonly trendSparklines: Locator;

  constructor(private readonly page: ScoutPage) {
    this.trendChartRow = this.page.testSubj.locator('alertZeroProposalsTrendChartRow');
    this.trendChartCards = this.page.testSubj.locator(
      '[data-test-subj^="alertZeroProposalsTrendChartCard-"]'
    );
    this.trendSparklines = this.page.testSubj.locator('alertZeroProposalsTrendSparkline');
  }

  async goto() {
    await this.page.gotoApp('alertzero', { readyWhen: this.trendChartRow });
  }
}
