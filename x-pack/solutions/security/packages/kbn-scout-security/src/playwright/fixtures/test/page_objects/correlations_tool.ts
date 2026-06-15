/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the correlations tool overlay inside the flyout v2 document flyout.
 * Covers both the summary row in the Insights section and the full tool overlay panel.
 */
export class CorrelationsToolPage {
  /** Title link in the insights correlations panel that opens the tool overlay. */
  public readonly titleLink: Locator;
  /** Header row of the tools flyout — use to confirm the overlay is open. */
  public readonly toolsFlyoutHeader: Locator;
  /** Clickable button in the tools flyout header showing the document icon and title. */
  public readonly toolsFlyoutTitle: Locator;
  /** Warning icon inside the tools flyout title button, confirming the document is an alert. */
  public readonly toolsFlyoutTitleAlertIcon: Locator;

  // --- Sections inside the correlations tool overlay ---
  /** Alerts table inside the "related by source event" section (visible when expanded). */
  public readonly sameSourceAlertsSectionTable: Locator;
  /** Expand button on the first alert row in the sameSource table. */
  public readonly sameSourceAlertsSectionFirstPreviewButton: Locator;
  /** "Investigate in timeline" button in the sameSource section header. */
  public readonly sameSourceAlertsSectionInvestigateInTimeline: Locator;

  /** Alerts table inside the "related by session" section (visible when expanded). */
  public readonly sessionAlertsSectionTable: Locator;
  /** Expand button on the first alert row in the session table. */
  public readonly sessionAlertsSectionFirstPreviewButton: Locator;

  constructor(page: ScoutPage) {
    this.titleLink = page.testSubj.locator('securitySolutionFlyoutCorrelationsTitleLink');
    this.toolsFlyoutHeader = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeader');
    this.toolsFlyoutTitle = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeaderTitle');
    this.toolsFlyoutTitleAlertIcon = page.testSubj.locator(
      'securitySolutionFlyoutToolsFlyoutHeaderTitleIcon'
    );
    this.sameSourceAlertsSectionTable = page.testSubj.locator(
      'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionTable'
    );
    this.sameSourceAlertsSectionFirstPreviewButton = page.testSubj.locator(
      'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionAlertPreviewButton'
    );
    this.sameSourceAlertsSectionInvestigateInTimeline = page.testSubj.locator(
      'securitySolutionFlyoutCorrelationsDetailsAlertsBySourceSectionInvestigateInTimeline'
    );
    this.sessionAlertsSectionTable = page.testSubj.locator(
      'securitySolutionFlyoutCorrelationsDetailsAlertsBySessionSectionTable'
    );
    this.sessionAlertsSectionFirstPreviewButton = page.testSubj.locator(
      'securitySolutionFlyoutCorrelationsDetailsAlertsBySessionSectionAlertPreviewButton'
    );
  }
}
