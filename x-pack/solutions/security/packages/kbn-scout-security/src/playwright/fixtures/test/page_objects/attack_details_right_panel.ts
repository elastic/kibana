/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

const ATTACK_DETAILS_FLYOUT_BODY_TEST_ID = 'attack-details-flyout-body';
const ATTACK_DETAILS_INSIGHTS_SECTION_HEADER_TEST_ID =
  'attack-details-flyout-overview-insights-sectionHeader';
const ATTACK_DETAILS_INSIGHTS_SECTION_CONTENT_TEST_ID =
  'attack-details-flyout-overview-insights-sectionContent';
const ATTACK_DETAILS_CORRELATIONS_SECTION_TEST_ID =
  'attack-details-flyout-overview-insights-correlations';
export class AttackDetailsRightPanelPage {
  public detailsFlyoutBody: Locator;
  public insightsSectionHeader: Locator;
  public insightsSectionContent: Locator;
  public correlationsSection: Locator;

  constructor(private readonly page: ScoutPage) {
    this.detailsFlyoutBody = this.page.testSubj.locator(ATTACK_DETAILS_FLYOUT_BODY_TEST_ID);
    this.insightsSectionHeader = this.page.testSubj.locator(
      ATTACK_DETAILS_INSIGHTS_SECTION_HEADER_TEST_ID
    );
    this.insightsSectionContent = this.page.testSubj.locator(
      ATTACK_DETAILS_INSIGHTS_SECTION_CONTENT_TEST_ID
    );
    this.correlationsSection = this.page.testSubj.locator(
      ATTACK_DETAILS_CORRELATIONS_SECTION_TEST_ID
    );
  }

  async expandInsightsSectionIfCollapsed() {
    if (await this.insightsSectionContent.isVisible()) {
      return;
    }

    await this.insightsSectionHeader.click();
    await this.insightsSectionContent.waitFor({ state: 'visible' });
  }
}
