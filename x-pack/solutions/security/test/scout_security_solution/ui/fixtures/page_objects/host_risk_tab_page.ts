/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/** Host Risk tab (hosts table risk column and risk tab) */
export class HostRiskTabPage {
  constructor(private readonly page: ScoutPage) {}

  get riskDetailsNav(): Locator {
    return this.page.testSubj.locator('navigation-hostRisk');
  }

  get loadingSpinner(): Locator {
    return this.page.testSubj.locator('loading-spinner');
  }

  get hostByRiskTableCell(): Locator {
    return this.page.testSubj.locator('table-hostRisk-loading-false').locator('.euiTableCellContent');
  }

  get hostByRiskTableFilter(): Locator {
    return this.page.testSubj.locator('risk-filter-popoverButton');
  }

  get hostByRiskTableFilterCritical(): Locator {
    return this.page.testSubj.locator('risk-filter-item-Critical');
  }

  get hostByRiskTablePerpageButton(): Locator {
    return this.page.locator('[data-test-subj="loadingMoreSizeRowPopover"] button');
  }

  get hostByRiskTablePerpageOptions(): Locator {
    return this.page.testSubj.locator('loadingMorePickSizeRow').locator('button');
  }

  get hostByRiskTableNextPageButton(): Locator {
    return this.page
      .testSubj.locator('numberedPagination')
      .locator('[data-test-subj="pagination-button-next"]');
  }

  get hostByRiskTableHostnameCell(): Locator {
    return this.page.testSubj.locator('cellActions-renderContent-host.name');
  }

  get tableHeaderCellNodeRisk(): Locator {
    return this.page.testSubj.locator('tableHeaderCell_node.risk_4');
  }

  async navigateToHostRiskTab(): Promise<void> {
    await this.loadingSpinner.first().waitFor({ state: 'hidden', timeout: 10000 });
    await this.riskDetailsNav.first().click();
    await this.loadingSpinner.first().waitFor({ state: 'hidden', timeout: 10000 });
  }

  async openRiskTableFilterAndSelectCritical(): Promise<void> {
    await this.hostByRiskTableFilter.first().click();
    await this.hostByRiskTableFilterCritical.first().click();
  }

  async removeCriticalFilterAndClose(): Promise<void> {
    await this.hostByRiskTableFilterCritical.first().click();
    await this.hostByRiskTableFilter.first().click();
  }

  async selectFiveItemsPerPage(): Promise<void> {
    await this.hostByRiskTablePerpageButton.first().click();
    await this.hostByRiskTablePerpageOptions.first().click();
  }
}
