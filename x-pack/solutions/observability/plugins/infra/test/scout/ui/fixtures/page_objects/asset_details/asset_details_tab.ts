/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../../constants';

export type AssetDetailsPageTabName =
  | 'Overview'
  | 'Metadata'
  | 'Metrics'
  | 'Processes'
  | 'Profiling'
  | 'Logs'
  | 'Anomalies'
  | 'Osquery'
  | 'Dashboards';

export abstract class AssetDetailsTab {
  public abstract readonly tabName: AssetDetailsPageTabName;
  public abstract readonly tab: Locator;

  constructor(protected readonly page: ScoutPage, protected readonly kbnUrl: KibanaUrl) {}

  public getTab(): Locator {
    return this.tab;
  }

  public async clickTab() {
    // The asset-details flyout re-renders its tab bar as data and UI settings
    // (e.g. the custom-dashboards tab gated by `enableInfrastructureAssetCustomDashboards`)
    // resolve after the flyout opens. A single click can land before the tab's
    // onClick is wired or be discarded by that re-render, leaving the tab
    // unselected. Retry the click until the tab reports selected so we converge
    // on the real end state instead of racing the re-render.
    await expect(async () => {
      await this.tab.click();
      await expect(this.tab).toHaveAttribute('aria-selected', 'true', { timeout: 2_000 });
    }).toPass({ timeout: EXTENDED_TIMEOUT });
  }
}
