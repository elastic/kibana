/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class RuleDetailsPage {
  readonly ruleNameHeader: Locator;
  readonly maxSignalsDetail: Locator;
  readonly setupGuideButton: Locator;
  readonly setupGuideContent: Locator;

  constructor(private readonly page: ScoutPage) {
    this.ruleNameHeader = this.page.testSubj.locator('header-page-title');
    this.maxSignalsDetail = this.page.testSubj.locator('maxSignalsPropertyValue');
    this.setupGuideButton = this.page.testSubj.locator('stepAboutDetailsToggle-setup');
    this.setupGuideContent = this.page.testSubj.locator('stepAboutDetailsSetupContent');
  }

  async openSetupGuide() {
    await this.setupGuideButton.click();
  }
}
