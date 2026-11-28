/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';
import type { AbsoluteTimeRange } from './helpers/timerange_url_param';
import { toTimerangeParam } from './helpers/timerange_url_param';

const OVERVIEW_APP = 'security/overview';

/**
 * Security Overview page, focused on the threat intelligence panel.
 */
export class SecurityOverviewPage {
  readonly threatIntelPanel: Locator;
  readonly threatIntelIndicatorCount: Locator;
  readonly threatIntelDisabledCallout: Locator;
  readonly threatIntelEnableModuleButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.threatIntelPanel = this.page.testSubj.locator('cti-dashboard-links');
    this.threatIntelIndicatorCount = this.threatIntelPanel.getByTestId('header-panel-subtitle');
    this.threatIntelDisabledCallout = this.page.testSubj.locator('cti-inner-panel-danger');
    this.threatIntelEnableModuleButton = this.page.testSubj.locator('cti-enable-module-button');
  }

  /** Indicator count cell in the threat intelligence panel row for a feed. */
  threatIntelFeedIndicatorCount(feedName: string): Locator {
    return this.threatIntelPanel
      .getByRole('row')
      .filter({ hasText: feedName })
      .getByTestId('cti-feed-indicator-count');
  }

  /** Opens Overview, optionally with an absolute global time range instead of the default. */
  async navigate(timeRange?: AbsoluteTimeRange): Promise<void> {
    await this.page.gotoApp(
      OVERVIEW_APP,
      timeRange ? { params: { timerange: toTimerangeParam(timeRange) } } : undefined
    );
    await this.threatIntelPanel.waitFor({ state: 'visible', timeout: APP_LOAD_TIMEOUT_MS });
  }
}
