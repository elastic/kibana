/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { AssetDetailsPageTabName } from './asset_details_tab';
import { AssetDetailsTab } from './asset_details_tab';

export class DashboardsTab extends AssetDetailsTab {
  public readonly tabName: AssetDetailsPageTabName = 'Dashboards';
  public readonly tab: Locator;

  public readonly addDashboardButton: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl) {
    super(page, kbnUrl);
    this.tab = this.page.getByTestId(`infraAssetDetails${this.tabName}Tab`);

    this.addDashboardButton = this.page.getByTestId('infraAddDashboard');
  }
}
