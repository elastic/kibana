/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const ROUTES = {
  endpoints: '/app/security/administration/endpoints',
};

export class EndpointListPage {
  readonly endpointPage: Locator;
  readonly endpointTable: Locator;
  readonly emptyState: Locator;
  readonly tableRows: Locator;
  readonly searchBar: Locator;

  constructor(private readonly page: ScoutPage) {
    this.endpointPage = this.page.testSubj.locator('endpointPage');
    this.endpointTable = this.page.testSubj.locator('endpointListTable');
    this.emptyState = this.page.testSubj.locator(
      'emptyHostsTable'
    );
    this.tableRows = this.endpointTable.locator('tbody tr');
    this.searchBar = this.page.testSubj.locator('adminSearchBar');
  }

  async navigate(searchParams?: string) {
    const url = searchParams
      ? `${ROUTES.endpoints}?${searchParams}`
      : ROUTES.endpoints;
    await this.page.goto(url);
    await this.page.waitForLoadingIndicatorHidden();
  }

  async waitForTableLoaded() {
    await this.endpointTable.waitFor({ state: 'visible' });
  }

  async getTableRowCount(): Promise<number> {
    await this.waitForTableLoaded();
    return this.tableRows.count();
  }

  async openEndpointDetails(agentId?: string) {
    if (agentId) {
      const row = this.endpointTable.locator(`[data-endpoint-id="${agentId}"]`);
      await row.locator('[data-test-subj="hostnameCellLink"]').click();
    } else {
      await this.page.testSubj.locator('hostnameCellLink').first().click();
    }
    await this.page.testSubj.locator('endpointDetailsFlyout').waitFor({ state: 'visible' });
  }

  async openResponderFromList(agentId?: string) {
    if (agentId) {
      const row = this.endpointTable.locator(`[data-endpoint-id="${agentId}"]`);
      await row.locator('[data-test-subj="endpointTableRowActions"]').click();
    } else {
      await this.page.testSubj.locator('endpointTableRowActions').first().click();
    }

    const menuPanel = this.page.testSubj.locator('tableRowActionsMenuPanel');
    await menuPanel.waitFor({ state: 'visible' });
    await menuPanel.locator('[data-test-subj="console"]').click();
    await this.page.testSubj.locator('consolePageOverlay').waitFor({ state: 'visible' });
  }

  async openResponderFromDetails() {
    await this.page.testSubj.locator('endpointDetailsActionsButton').click();
    const popover = this.page.testSubj.locator('endpointDetailsActionsPopover');
    await popover.waitFor({ state: 'visible' });
    await popover.locator('[data-test-subj="console"]').click();
    await this.page.testSubj.locator('consolePageOverlay').waitFor({ state: 'visible' });
  }
}
