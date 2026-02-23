/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/** Risk information flyout (host details) */
export class EntityAnalyticsRiskInfoPage {
  constructor(private readonly page: ScoutPage) {}

  public get openRiskInformationFlyoutButton(): Locator {
    return this.page.testSubj.locator('open-risk-information-flyout-trigger');
  }

  public get riskInformationFlyoutHeader(): Locator {
    return this.page.locator('[data-test-subj="open-risk-information-flyout"] .euiFlyoutHeader');
  }

  async openRiskInformationFlyout(): Promise<void> {
    await this.openRiskInformationFlyoutButton.first().click();
  }
}
