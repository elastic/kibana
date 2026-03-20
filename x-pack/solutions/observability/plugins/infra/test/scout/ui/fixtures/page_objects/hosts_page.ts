/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class HostsPage {
  public readonly tableLoaded: Locator;
  public readonly tableRows: Locator;
  public readonly searchBar: Locator;
  public readonly logsTab: Locator;
  public readonly logsSearchBar: Locator;
  public readonly excludeButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.tableLoaded = this.page.getByTestId('hostsView-table-loaded');
    this.tableRows = this.page.getByTestId('hostsView-tableRow');
    this.searchBar = this.page.getByTestId('queryInput');
    this.logsTab = this.page.getByTestId('hostsView-tabs-logs');
    this.logsSearchBar = this.page.getByTestId('hostsView-logs-text-field-search');
    this.excludeButton = this.page.getByTestId('optionsList__excludeResults');
  }

  private async waitForTableToLoad() {
    await this.tableLoaded.waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  public async filterByQueryBar(query: string) {
    await this.searchBar.clear();
    await this.searchBar.fill(query);
    await this.searchBar.press('Enter');
    await this.waitForTableToLoad();
  }

  public async goToPage({ from, to }: { from: string; to: string }) {
    const baseUrl = this.kbnUrl.app('metrics');
    const risonState = `(dateRange:(from:'${from}',to:'${to}'),filters:!(),limit:100,panelFilters:!(),preferredSchema:!n,query:(language:kuery,query:''))`;
    await this.page.goto(`${baseUrl}/hosts?_a=${risonState}`);
    await this.waitForTableToLoad();
  }

  public async openHostFlyout(hostName: string) {
    const row = this.tableRows.filter({ hasText: hostName });
    await row.getByTestId('hostsView-flyout-button').click();
    await this.page
      .getByRole('dialog')
      .getByRole('heading', { name: hostName })
      .waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  public async closeFlyout() {
    await this.page.getByTestId('euiFlyoutCloseButton').click();
    await this.waitForTableToLoad();
  }

  public async openFilterControl(fieldName: string) {
    const controlTestId = `optionsList-control-${fieldName}`;
    const control = this.page.getByTestId(controlTestId);
    await control.waitFor();
    await control.click();
    await this.excludeButton.waitFor();
  }

  public async enableExcludeMode() {
    await this.excludeButton.waitFor();
    await this.excludeButton.click();
  }

  public async selectFilterOption(optionValue: string) {
    const optionTestId = `optionsList-control-selection-${optionValue}`;
    const option = this.page.getByTestId(optionTestId);
    await option.waitFor();
    await option.click();
    await this.waitForTableToLoad();
  }
}
