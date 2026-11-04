/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/** Watchlist create / edit flyout (`WatchlistFlyout`). */
export class WatchlistEditFlyout {
  public readonly flyout: Locator;
  public readonly header: Locator;
  public readonly indexPatternComboBox: Locator;
  /** Warning shown when an index data source has no API key (the callout has no test subject). */
  public readonly missingApiKeyCallout: Locator;

  constructor(private readonly page: ScoutPage) {
    this.flyout = this.page.testSubj.locator('watchlistFlyout');
    this.header = this.flyout.getByTestId('watchlist-flyout-header');
    this.indexPatternComboBox = this.flyout.getByTestId('watchlistIndexPatternComboBox');
    this.missingApiKeyCallout = this.flyout.getByText('Sync paused — re-authorization required');
  }
}
