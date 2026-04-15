/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout-oblt';

export class ServerlessNav {
  public readonly sidenav: Locator;

  constructor(private readonly page: ScoutPage) {
    this.sidenav = this.page.testSubj.locator('kbnChromeLayoutNavigation');
  }

  async goto() {
    await this.page.gotoApp('observability');
    await this.sidenav.waitFor({ state: 'visible', timeout: 30_000 });
  }

  getPageLocator(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj);
  }

  /**
   * Returns a locator matching either the expected page element or the no-data page.
   * Apps like Discover/Dashboards show a no-data prompt when no data views exist.
   */
  pageOrNoData(testSubj: string): Locator {
    return this.page.testSubj.locator(testSubj).or(this.page.testSubj.locator('kbnNoDataPage'));
  }
}
