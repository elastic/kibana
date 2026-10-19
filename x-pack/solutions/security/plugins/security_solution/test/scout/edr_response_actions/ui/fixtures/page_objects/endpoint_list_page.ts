/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    // The table renders only after the first metadata list request returns.
    await this.table.waitFor({ state: 'visible' });
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
