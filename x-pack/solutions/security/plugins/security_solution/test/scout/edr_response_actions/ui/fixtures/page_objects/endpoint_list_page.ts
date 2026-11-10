/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_LOAD_TIMEOUT_MS } from '@kbn/scout-security';
import type { Locator, ScoutPage, SecurityPageObjects } from '@kbn/scout-security';

const ENDPOINTS_APP_PATH = 'security/administration/endpoints';
// Two global-search options link to ENDPOINTS_APP_PATH ("Assets / Endpoints" and its child page); this label picks the child.
const ENDPOINTS_SEARCH_OPTION_LABEL = 'Assets / Endpoints / Endpoints';

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

  /**
   * Opens the list through the global search, without a page load, so in-memory state such
   * as a running response console survives the navigation.
   */
  async openFromGlobalSearch(
    chrome: SecurityPageObjects['chrome'],
    spaceId: string
  ): Promise<void> {
    const spacePath = spaceId === 'default' ? '' : `/s/${spaceId}`;
    await chrome.openSearch();
    await chrome.search('endpoints');
    await chrome
      .getSearchOptionByUrl(`${spacePath}/app/${ENDPOINTS_APP_PATH}`)
      .filter({ hasText: ENDPOINTS_SEARCH_OPTION_LABEL })
      .click();
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
