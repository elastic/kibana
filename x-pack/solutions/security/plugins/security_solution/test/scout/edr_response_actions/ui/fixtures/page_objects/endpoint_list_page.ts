/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage } from '@kbn/scout-security';

const ENDPOINTS_APP_PATH = 'security/administration/endpoints';

/**
 * Endpoint list (Manage > Endpoints). Actions only; the spec asserts.
 */
export class EndpointListPage {
  readonly table: Locator;
  readonly respondMenuItem: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('endpointListTable');
    this.respondMenuItem = this.page.testSubj.locator('console');
  }

  async goto(): Promise<void> {
    await this.page.gotoApp(ENDPOINTS_APP_PATH);
    // Until the user privileges and the list init (metadata list, then the search-bar
    // fields) finish, the page shows "Loading Endpoint Management" and no table. On a
    // cold first load that took over the default 10s action timeout in CI.
    await this.table.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }

  /** The table row whose hostname cell links to `hostname`. */
  rowFor(hostname: string): Locator {
    return this.table.getByRole('row').filter({
      has: this.page.testSubj.locator('hostnameCellLink').filter({ hasText: hostname }),
    });
  }

  /** Opens the row action menu for `hostname` and chooses Respond. */
  async openResponder(hostname: string): Promise<void> {
    await this.rowFor(hostname).getByTestId('endpointTableRowActions').click();
    await this.respondMenuItem.click();
  }
}
