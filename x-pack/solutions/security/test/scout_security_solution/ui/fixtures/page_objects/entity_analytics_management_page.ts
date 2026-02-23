/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { waitForPageReady } from '../../common/page_utils';

/** Entity Analytics Management page (risk engine, entity store settings) */
export class EntityAnalyticsManagementPage {
  constructor(private readonly page: ScoutPage) {}

  public get pageTitle(): Locator {
    return this.page.testSubj.locator('entityAnalyticsManagementPageTitle');
  }

  public get riskPreviewError(): Locator {
    return this.page.testSubj.locator('risk-preview-error');
  }

  public get riskPreviewErrorButton(): Locator {
    return this.page.testSubj.locator('risk-preview-error-button');
  }

  public get riskScoreErrorPanel(): Locator {
    return this.page.testSubj.locator('risk-score-error-panel');
  }

  public get riskScoreStatus(): Locator {
    return this.page.testSubj.locator('risk-score-status');
  }

  public get riskScoreStatusLoading(): Locator {
    return this.page.testSubj.locator('risk-score-status-loading');
  }

  public get riskScorePrivilegesCallout(): Locator {
    return this.page.testSubj.locator('callout-missing-risk-engine-privileges');
  }

  public get riskScoreSwitch(): Locator {
    return this.page.testSubj.locator('risk-score-switch');
  }

  public get riskScorePreviewPrivilegesCallout(): Locator {
    return this.page.testSubj.locator('missing-risk-engine-preview-permissions');
  }

  async navigate(): Promise<void> {
    await this.page.gotoApp('security/entity_analytics_management');
    await waitForPageReady(this.page);
  }

  async clickRiskEngineSwitch(): Promise<void> {
    await this.riskScoreSwitch.first().click();
  }

  async clickPreviewErrorButton(): Promise<void> {
    await this.riskPreviewErrorButton.first().click();
  }
}
