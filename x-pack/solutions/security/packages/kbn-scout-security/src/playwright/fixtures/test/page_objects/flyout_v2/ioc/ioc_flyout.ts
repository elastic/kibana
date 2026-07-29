/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { encode } from '@kbn/rison';

const ALERTS_PAGE_URL = 'security/alerts';

/**
 * Page object for the flyout_v2 IOC (Indicator of Compromise) flyout, opened from the
 * Threat Intelligence indicators table row's `tiToggleIndicatorFlyoutButton`.
 */
export class IOCFlyout {
  /**
   * Flyout header title ("Indicator details"). The header renders it via FlyoutTitle, which
   * suffixes the test subject with "Text".
   */
  public readonly title: Locator;
  /** Indicator name rendered as the overview heading. */
  public readonly indicatorName: Locator;
  /** Highlighted-fields table rendered in the Overview tab. */
  public readonly overviewTable: Locator;

  constructor(private readonly page: ScoutPage) {
    this.title = page.testSubj.locator('securitySolutionFlyoutIOCDetailsTitleText');
    this.indicatorName = page.testSubj.locator('tiFlyoutOverviewTitle');
    this.overviewTable = page.testSubj.locator('tiFlyoutOverviewTableRow');
  }

  /** Restore the IOC flyout from URL state without depending on the indicators landing page. */
  async openForIndicator({
    indicatorId,
    indicatorIndex,
  }: {
    indicatorId: string;
    indicatorIndex: string;
  }) {
    await this.page.gotoApp(ALERTS_PAGE_URL, {
      params: {
        flyoutV2: encode([{ kind: 'ioc', indicatorId, indicatorIndex }]),
      },
    });
    await this.waitForFlyout();
  }

  /** Wait for the flyout to be visible and its title rendered. */
  async waitForFlyout() {
    await this.title.waitFor({ state: 'visible', timeout: 15_000 });
  }
}
