/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const PAGE_URL = 'security/reports/ai_value';

export class AIValueReportPage {
  public readonly container: Locator;
  public readonly sampleBanner: Locator;
  public readonly sampleDataBadge: Locator;
  public readonly attackDiscoveryCtaButton: Locator;
  public readonly exportButton: Locator;
  public readonly noPrivilegesPage: Locator;
  public readonly noResultsEmptyState: Locator;
  public readonly executiveSummary: Locator;

  constructor(private readonly page: ScoutPage) {
    this.container = this.page.testSubj.locator('aiValuePage');
    this.sampleBanner = this.page.testSubj.locator('aiValueSampleAttackDiscoveryBanner');
    this.sampleDataBadge = this.page.testSubj.locator('aiValueSampleDataBadge');
    this.attackDiscoveryCtaButton = this.page.testSubj.locator('sampleAttackDiscoveryCtaButton');
    this.exportButton = this.page.testSubj.locator('aiValueExportButton');
    this.noPrivilegesPage = this.page.testSubj.locator('noPrivilegesPage');
    this.noResultsEmptyState = this.page.testSubj.locator('aiValueNoResultsEmptyState');
    this.executiveSummary = this.page.testSubj.locator('executiveSummaryContainer');
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }
}
