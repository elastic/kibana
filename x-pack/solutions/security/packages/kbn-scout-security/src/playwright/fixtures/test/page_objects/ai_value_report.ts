/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/reports/ai_value';

export class AIValueReportPage {
  public readonly page: Locator;
  public readonly sampleBanner: Locator;
  public readonly sampleDataBadge: Locator;
  public readonly attackDiscoveryCtaButton: Locator;
  public readonly exportButton: Locator;
  public readonly noPrivilegesPage: Locator;
  public readonly noResultsEmptyState: Locator;
  public readonly executiveSummary: Locator;

  constructor(private readonly scoutPage: ScoutPage) {
    this.page = this.scoutPage.testSubj.locator('aiValuePage');
    this.sampleBanner = this.scoutPage.testSubj.locator('aiValueSampleAttackDiscoveryBanner');
    this.sampleDataBadge = this.scoutPage.testSubj.locator('aiValueSampleDataBadge');
    this.attackDiscoveryCtaButton = this.scoutPage.testSubj.locator(
      'sampleAttackDiscoveryCtaButton'
    );
    this.exportButton = this.scoutPage.testSubj.locator('aiValueExportButton');
    this.noPrivilegesPage = this.scoutPage.testSubj.locator('noPrivilegesPage');
    this.noResultsEmptyState = this.scoutPage.testSubj.locator('aiValueNoResultsEmptyState');
    this.executiveSummary = this.scoutPage.testSubj.locator('executiveSummaryContainer');
  }

  async navigate() {
    await this.scoutPage.gotoApp(PAGE_URL);
  }
}
