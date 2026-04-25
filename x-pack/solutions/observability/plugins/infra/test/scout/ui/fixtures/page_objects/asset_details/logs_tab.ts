/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { AssetDetailsPageTabName } from './asset_details_tab';
import { AssetDetailsTab } from './asset_details_tab';

export class LogsTab extends AssetDetailsTab {
  public readonly tabName: AssetDetailsPageTabName = 'Logs';
  public readonly tab: Locator;

  public readonly searchBar: Locator;
  public readonly openInDiscoverButton: Locator;

  public readonly table: Locator;
  public readonly tableTotalDocumentsLabel: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl) {
    super(page, kbnUrl);
    this.tab = this.page.getByTestId(`infraAssetDetails${this.tabName}Tab`);

    this.searchBar = this.page.getByTestId('infraAssetDetailsLogsTabFieldSearch');
    this.openInDiscoverButton = this.page.getByTestId('infraAssetDetailsLogsTabOpenInLogsButton');

    this.table = this.page.getByTestId('embeddedSavedSearchDocTable');
    this.tableTotalDocumentsLabel = this.table.getByTestId('savedSearchTotalDocuments');
  }

  public async filterTable(searchTerm: string) {
    await this.searchBar.pressSequentially(searchTerm);
  }
}
