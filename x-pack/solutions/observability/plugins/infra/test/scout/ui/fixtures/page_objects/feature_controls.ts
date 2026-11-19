/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

/**
 * Page object for the infra feature-controls suites (security + spaces). It
 * centralizes navigation to the Infrastructure (`metrics`) and Logs (`logs`)
 * apps, the shared header read-only badge, and the classic side-nav app links
 * used to assert per-privilege / per-space visibility.
 */
export class FeatureControlsPage {
  public readonly infraNoDataPage: Locator;
  public readonly logsApp: Locator;
  public readonly readOnlyBadge: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.infraNoDataPage = this.page.getByTestId('kbnNoDataPage');
    this.logsApp = this.page.getByTestId('infraLogsPage');
    this.readOnlyBadge = this.page.getByTestId('headerBadge');
  }

  async gotoHome(spaceId?: string) {
    await this.page.goto(this.kbnUrl.app('home', spaceId ? { space: spaceId } : undefined));
    await this.page.getByTestId('logo').waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async gotoInfrastructure(spaceId?: string) {
    await this.page.goto(this.kbnUrl.app('metrics', spaceId ? { space: spaceId } : undefined));
  }

  async gotoLogs(spaceId?: string) {
    await this.page.goto(this.kbnUrl.app('logs', spaceId ? { space: spaceId } : undefined));
  }

  /**
   * Opens a logs app sub-route that stays mounted in the legacy Logs UI. The
   * root `/app/logs` path redirects to Discover when observability-logs-explorer
   * is accessible, which unmounts `infraLogsPage` before assertions can run.
   */
  async gotoLogsRoute(path: string, spaceId?: string) {
    await this.page.goto(
      `${this.kbnUrl.app('logs', spaceId ? { space: spaceId } : undefined)}/${path}`
    );
    await this.logsApp.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  /**
   * Force the Infrastructure app's empty state. The parallel config ingests infra
   * data cluster-wide (data streams aren't space-scoped), so `kbnNoDataPage` can
   * never appear naturally; stubbing the source `hasData` check lets the security
   * and spaces suites deterministically assert the no-data landing page (the FTR
   * "landing page without data" scenario). Mirrors the sibling empty-state specs.
   */
  async forceInfraNoData() {
    await this.page.route(
      (url) => url.pathname.includes('/api/metrics/source/hasData'),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ hasData: false }),
        })
    );
  }

  /**
   * Scoped to the classic side nav so unrelated in-page links (solution cards,
   * add-data CTAs) never satisfy the assertion — mirrors the FTR `appsMenu`
   * check which only read navigation links.
   */
  getNavLink(name: string) {
    return this.page.getByTestId('collapsibleNav').getByRole('link', { name, exact: true });
  }
}
