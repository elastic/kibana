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
  /** Header row of the tools flyout — use to confirm the overlay is open. */
  public readonly toolsFlyoutHeader: Locator;
  /** Clickable button in the tools flyout header showing the document icon and title. */
  public readonly toolsFlyoutTitle: Locator;
  /** Warning icon inside the tools flyout title button, confirming the document is an alert. */
  public readonly toolsFlyoutTitleAlertIcon: Locator;

  /** The prevalence details table. */
  public readonly table: Locator;
  /** Hover-down popover that appears when the cursor is over a cell-actions-enabled value. */
  public readonly hoverActionsPopover: Locator;
  /** Filter-in action button that appears inside the hover popover. */
  public readonly filterInAction: Locator;
  /** Filter-out action button that appears inside the hover popover. */
  public readonly filterOutAction: Locator;
  /** Add-to-timeline action button that appears inside the hover popover. */
  public readonly addToTimelineAction: Locator;
  /** Filter badge(s) added to the page search bar; use toHaveCount() to assert the number. */
  public readonly filterBadges: Locator;
  /**
   * ChildLink for the source.ip value in the prevalence table.
   * Scoped to the row whose text includes "source.ip" so it resolves to exactly one element.
   */
  public readonly sourceIpChildLink: Locator;
  constructor(page: ScoutPage) {
    this.titleLink = page.testSubj.locator('securitySolutionFlyoutInsightsPrevalenceTitleLink');
    this.toolsFlyoutHeader = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeader');
    this.toolsFlyoutTitle = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeaderTitle');
    this.toolsFlyoutTitleAlertIcon = page.testSubj.locator(
      'securitySolutionFlyoutToolsFlyoutHeaderTitleIcon'
    );
    this.table = page.testSubj.locator('securitySolutionFlyoutPrevalenceDetailsTable');
    this.hoverActionsPopover = page.testSubj
      .locator('hoverActionsPopover')
      .filter({ visible: true });
    this.filterInAction = this.hoverActionsPopover.getByTestId(
      'actionItem-security-default-cellActions-filterIn'
    );
    this.filterOutAction = this.hoverActionsPopover.getByTestId(
      'actionItem-security-default-cellActions-filterOut'
    );
    this.addToTimelineAction = this.hoverActionsPopover.getByTestId(
      'actionItem-security-default-cellActions-addToTimeline'
    );
    this.filterBadges = page.locator('[id^="popoverFor_filter"]');
    this.sourceIpChildLink = page.testSubj
      .locator('securitySolutionFlyoutPrevalenceDetailsTable')
      .locator('tr')
      .filter({ hasText: 'source.ip' })
      .locator('[data-test-subj="securitySolutionFlyoutOpenFlyoutLink"]');
  }

  /** "Investigate in timeline" button for a deterministic prevalence field row. */
  alertCountTimelineButton(fieldName: string): Locator {
    return this.table
      .getByRole('row')
      .filter({ hasText: fieldName })
      .getByTestId('securitySolutionFlyoutPrevalenceDetailsTableInvestigateInTimelineButton');
  }
}
