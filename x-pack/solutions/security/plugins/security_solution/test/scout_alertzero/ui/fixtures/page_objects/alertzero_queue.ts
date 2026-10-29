/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

const TREND_CHART_CARD_IDS = ['respond', 'investigate', 'configure'] as const;

export class AlertZeroQueuePage {
  public readonly trendChartRow: Locator;
  public readonly trendChartCards: Locator;
  public readonly trendSparklines: Locator;

  constructor(private readonly page: ScoutPage) {
    this.trendChartRow = this.page.testSubj.locator('alertZeroProposalsTrendChartRow');
    this.trendChartCards = TREND_CHART_CARD_IDS.map((id) =>
      this.page.testSubj.locator(`alertZeroProposalsTrendChartCard-${id}`)
    ).reduce((cards, card) => cards.or(card));
    this.trendSparklines = this.page.testSubj.locator('alertZeroProposalsTrendSparkline');
  }

  async goto() {
    await this.page.gotoApp('alertzero', { readyWhen: this.trendChartRow });
  }
}
