/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/reports/ai_value';

export class AIValueReportPage {
  public page: Locator;
  public sampleBanner: Locator;
  public sampleDataBadge: Locator;
  public attackDiscoveryCtaButton: Locator;
  public exportButton: Locator;
  public noPrivilegesPage: Locator;

  constructor(private readonly scoutPage: ScoutPage) {
    this.page = this.scoutPage.testSubj.locator('aiValuePage');
    this.sampleBanner = this.scoutPage.testSubj.locator('aiValueSampleAttackDiscoveryBanner');
    this.sampleDataBadge = this.scoutPage.testSubj.locator('aiValueSampleDataBadge');
    this.attackDiscoveryCtaButton = this.scoutPage.testSubj.locator(
      'sampleAttackDiscoveryCtaButton'
    );
    this.exportButton = this.scoutPage.testSubj.locator('aiValueExportButton');
    this.noPrivilegesPage = this.scoutPage.testSubj.locator('noPrivilegesPage');
  }

  async navigate() {
    await this.scoutPage.gotoApp(PAGE_URL);
  }
}
