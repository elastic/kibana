/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { AssetDetailsPageTabName } from './asset_details_tab';
import { AssetDetailsTab } from './asset_details_tab';

export class ProcessesTab extends AssetDetailsTab {
  public readonly tabName: AssetDetailsPageTabName = 'Processes';
  public readonly tab: Locator;

  public readonly content: Locator;
  public readonly table: Locator;
  public readonly searchBar: Locator;
  public readonly searchInputError: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl) {
    super(page, kbnUrl);
    this.tab = this.page.getByTestId(`infraAssetDetails${this.tabName}Tab`);

    this.content = this.page.getByTestId('infraAssetDetailsProcessesTabContent');
    this.table = this.page.getByTestId('infraAssetDetailsProcessesTable');
    this.searchBar = this.page.getByTestId('infraAssetDetailsProcessesSearchBarInput');
    this.searchInputError = this.page.getByTestId('infraAssetDetailsProcessesSearchInputError');
  }
}
