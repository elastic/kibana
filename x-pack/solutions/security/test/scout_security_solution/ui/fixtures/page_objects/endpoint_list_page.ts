/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { APP_ENDPOINTS_PATH } from '../../common/defend_workflows_urls';

const AGENT_HOSTNAME_CELL = 'hostnameCellLink';
const TABLE_ROW_ACTIONS = 'endpointTableRowActions';
const TABLE_ROW_ACTIONS_MENU = 'tableRowActionsMenuPanel';

/**
 * Page object for Endpoint List management.
 */
export class EndpointListPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(): Promise<void> {
    await this.page.goto(APP_ENDPOINTS_PATH);
  }

  async navigate(): Promise<void> {
    await this.page.goto(APP_ENDPOINTS_PATH);
  }

  async waitForPageToLoad(): Promise<void> {
    await this.page.testSubj.locator('globalLoadingIndicator').first().waitFor({ state: 'hidden' });
    await this.page.testSubj.locator('endpointListTable').first().waitFor({ state: 'visible' });
  }

  getHostnameCell(hostname: string) {
    return this.page.testSubj
      .locator(AGENT_HOSTNAME_CELL)
      .filter({ hasText: hostname })
      .first();
  }

  getTableRowByHostname(hostname: string) {
    return this.page
      .locator(`tr[data-endpoint-id]`)
      .filter({ has: this.page.testSubj.locator(AGENT_HOSTNAME_CELL).filter({ hasText: hostname }) })
      .first();
  }

  getTableRowByEndpointId(endpointId: string) {
    return this.page.locator(`tr[data-endpoint-id="${endpointId}"]`).first();
  }

  async openRowActionsMenu(options?: { hostname?: string; endpointId?: string }): Promise<void> {
    let row;
    if (options?.endpointId) {
      row = this.getTableRowByEndpointId(options.endpointId);
    } else if (options?.hostname) {
      row = this.getTableRowByHostname(options.hostname);
    } else {
      row = this.page.locator('tr[data-endpoint-id]').first();
    }
    await row.locator(`[data-test-subj="${TABLE_ROW_ACTIONS}"]`).first().click();
    await this.page.testSubj.locator(TABLE_ROW_ACTIONS_MENU).first().waitFor({ state: 'visible' });
  }

  async openResponseConsoleFromRow(options?: { hostname?: string; endpointId?: string }): Promise<void> {
    await this.openRowActionsMenu(options);
    await this.page.testSubj.locator('console').first().click();
  }
}
