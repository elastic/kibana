/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const OVERVIEW_APP = 'security/overview';

export interface AbsoluteTimeRange {
  from: string;
  to: string;
}

/** Builds the rison value of the Security `timerange` URL param for an absolute range. */
const toTimerangeParam = ({ from, to }: AbsoluteTimeRange): string => {
  const range = `(from:'${from}',kind:absolute,to:'${to}')`;
  return `(global:(linkTo:!(timeline),timerange:${range}),timeline:(linkTo:!(global),timerange:${range}))`;
};

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

  /** Opens Overview, optionally with an absolute global time range instead of the default. */
  async navigate(timeRange?: AbsoluteTimeRange): Promise<void> {
    await this.page.gotoApp(
      OVERVIEW_APP,
      timeRange ? { params: { timerange: toTimerangeParam(timeRange) } } : undefined
    );
    await this.threatIntelPanel.waitFor({ state: 'visible' });
  }
}
