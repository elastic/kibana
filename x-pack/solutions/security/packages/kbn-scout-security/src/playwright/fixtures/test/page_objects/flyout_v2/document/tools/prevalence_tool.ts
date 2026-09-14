/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the prevalence tool overlay inside the flyout v2 document flyout.
 */
export class PrevalenceTool {
  /** Title link in the insights prevalence panel that opens the tool overlay. */
  public readonly titleLink: Locator;
  /** Clickable button in the tools flyout header showing the document icon and title. */
  public readonly toolsFlyoutTitle: Locator;
  /** Warning icon inside the tools flyout title button, confirming the document is an alert. */
  public readonly toolsFlyoutTitleAlertIcon: Locator;

  constructor(page: ScoutPage) {
    this.titleLink = page.testSubj.locator('securitySolutionFlyoutInsightsPrevalenceTitleLink');
    this.toolsFlyoutTitle = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeaderTitle');
    this.toolsFlyoutTitleAlertIcon = page.testSubj.locator(
      'securitySolutionFlyoutToolsFlyoutHeaderTitleIcon'
    );
  }
}
