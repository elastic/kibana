/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * flyout_v2 Response section on the document (alert) flyout.
 * Legacy Cypress used `securitySolutionFlyoutResponseTab` — that tab is gone.
 */
export class AlertResponsePage {
  public readonly sectionHeader: Locator;
  public readonly responseButton: Locator;
  public readonly details: Locator;

  constructor(private readonly page: ScoutPage) {
    this.sectionHeader = this.page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader');
    this.responseButton = this.page.testSubj.locator('securitySolutionFlyoutResponseButton');
    this.details = this.page.testSubj.locator('securitySolutionFlyoutResponseDetails');
  }

  async openResponseDetails(): Promise<void> {
    await this.sectionHeader.click();
    await this.responseButton.click();
    await this.details.waitFor({ state: 'visible' });
  }
}
