/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { AssetDetailsPageTabName } from './asset_details_tab';
import { AssetDetailsTab } from './asset_details_tab';

export class MetadataTab extends AssetDetailsTab {
  public readonly tabName: AssetDetailsPageTabName = 'Metadata';
  public readonly tab: Locator;

  public readonly searchBar: Locator;

  public readonly table: Locator;
  public readonly tableHeader: Locator;
  public readonly tableRows: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl) {
    super(page, kbnUrl);
    this.tab = this.page.getByTestId(`infraAssetDetails${this.tabName}Tab`);

    this.searchBar = this.page.getByTestId('infraAssetDetailsMetadataSearchBarInput');

    this.table = this.page.getByTestId('infraAssetDetailsMetadataTable');
    this.tableHeader = this.table.locator('thead tr');
    this.tableRows = this.table.locator('tbody tr');
  }

  public getRowForField(fieldName: string) {
    return this.tableRows.filter({ hasText: fieldName });
  }

  public getPinButtonsForField(fieldName: string) {
    const row = this.getRowForField(fieldName);

    const pin = row.getByTestId('infraAssetDetailsMetadataAddPin');
    const unpin = row.getByTestId('infraAssetDetailsMetadataRemovePin');

    return { pin, unpin };
  }

  public async pinField(fieldName: string) {
    const pinButtons = this.getPinButtonsForField(fieldName);

    await pinButtons.pin.click();
    await pinButtons.unpin.focus();
  }

  public async unpinField(fieldName: string) {
    const pinButtons = this.getPinButtonsForField(fieldName);

    await pinButtons.unpin.click();
    await pinButtons.pin.focus();
  }

  public async filterField(fieldName: string) {
    await this.searchBar.pressSequentially(fieldName);
  }
}
