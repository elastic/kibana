/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { VECTORDB_SPA_SHELL_TIMEOUT_MS } from '../constants';

/**
 * Chrome side nav for the Vector DB project — locators and actions only; specs own `expect`.
 * Modeled on `ObservabilityNavigation` in `@kbn/scout-oblt`.
 */
export class VectordbNavigation {
  readonly sidenav: Locator;
  readonly primaryNav: Locator;
  readonly footerNav: Locator;
  readonly breadcrumbs: Locator;

  constructor(private readonly page: ScoutPage) {
    this.sidenav = page.testSubj.locator('kbnChromeLayoutNavigation');
    this.primaryNav = page.testSubj.locator('kbnChromeNav-primaryNavigation');
    this.footerNav = page.testSubj.locator('kbnChromeNav-footer');
    this.breadcrumbs = page.testSubj.locator('breadcrumbs');
  }

  async goto() {
    await this.page.gotoApp('vectordb');
  }

  /** Waits on `primaryNav` (outer layout can be 0-width until CSS vars apply). */
  async waitForLoad(options?: { timeout?: number }) {
    await this.primaryNav.waitFor({
      state: 'visible',
      timeout: options?.timeout ?? VECTORDB_SPA_SHELL_TIMEOUT_MS,
    });
  }

  /**
   * App root or one of the shared no-data shells: Discover/Dashboards delegate to
   * `KibanaNoDataPage`, which renders `kbnNoDataPage` or `noDataViewsPrompt` depending
   * on cluster state. The shells are mutually exclusive, so an `.or()` chain is enough.
   */
  pageOrNoData(testSubj: string): Locator {
    return this.page.testSubj
      .locator(testSubj)
      .or(this.page.testSubj.locator('kbnNoDataPage'))
      .or(this.page.testSubj.locator('noDataViewsPrompt'));
  }

  navItemInPrimaryByDeepLinkId(deepLinkId: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInPrimaryById(id: string): Locator {
    return this.primaryNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  navItemInFooterByDeepLinkId(deepLinkId: string): Locator {
    return this.footerNav.locator(`[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"]`);
  }

  navItemInFooterById(id: string): Locator {
    return this.footerNav.locator(`[data-test-subj~="nav-item-id-${id}"]`);
  }

  /** Item with `nav-item-isActive` in test-subj (current route). */
  activeNavItemByDeepLinkId(deepLinkId: string): Locator {
    return this.sidenav.locator(
      `[data-test-subj~="nav-item-deepLinkId-${deepLinkId}"][data-test-subj~="nav-item-isActive"]`
    );
  }

  sidePanel(id: string): Locator {
    return this.page.testSubj.locator(`~kbnChromeNav-sidePanel_${id}`);
  }
}
