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

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.tableLoaded = this.page.getByTestId('hostsView-table-loaded');
    this.tableRows = this.page.getByTestId('hostsView-tableRow');
  }

  private async waitForTableToLoad() {
    await this.tableLoaded.waitFor({ timeout: EXTENDED_TIMEOUT });
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
}
