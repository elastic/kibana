/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the threat intelligence tool overlay inside the flyout v2 document flyout.
 * Covers both the summary row in the Insights section and the full tool overlay panel.
 */
export class ThreatIntelligenceTool {
  /** Title link in the insights TI panel; only rendered when the alert has TI enrichments. */
  public readonly titleLink: Locator;
  /** Loading spinner while the insights TI panel's enrichment count query is in flight. */
  public readonly enrichedLoading: Locator;
  /** "Fields enriched with threat intelligence" count button in the insights panel. */
  public readonly enrichedButton: Locator;
  /** Loading spinner while the TI tool overlay fetches event data. */
  public readonly detailsLoading: Locator;
  /** Loading spinner while the TI tool overlay fetches investigation-time enrichments. */
  public readonly detailsLoadingEnrichment: Locator;
  /** "Enriched with threat intelligence" section inside the TI tool overlay. */
  public readonly detailsEnrichedSection: Locator;
  /** Date range picker for investigation-time enrichments in the TI tool overlay. */
  public readonly detailsRangePicker: Locator;
  /** All enrichment accordions in the TI tool overlay. */
  public readonly detailsAccordions: Locator;
  /** "This alert does not have threat intelligence." message shown when there are no enrichments. */
  public readonly detailsNoEnrichmentFound: Locator;
  /** All rendered content sections inside the TI tool overlay; used to assert any content rendered. */
  public readonly detailsSections: Locator;
  /** Clickable button in the tools flyout header showing the document icon and title. */
  public readonly toolsFlyoutTitle: Locator;
  /** Warning icon inside the tools flyout title button, confirming the document is an alert. */
  public readonly toolsFlyoutTitleAlertIcon: Locator;

  private readonly page: ScoutPage;

  constructor(page: ScoutPage) {
    this.page = page;
    this.titleLink = page.testSubj.locator(
      'securitySolutionFlyoutInsightsThreatIntelligenceTitleLink'
    );
    this.enrichedLoading = page.testSubj.locator(
      'securitySolutionFlyoutInsightsThreatIntelligenceEnrichedWithThreatIntelligenceLoading'
    );
    this.enrichedButton = page.testSubj.locator(
      'securitySolutionFlyoutInsightsThreatIntelligenceEnrichedWithThreatIntelligenceButton'
    );
    this.detailsLoading = page.testSubj.locator(
      'securitySolutionFlyoutThreatIntelligenceDetailsLoading'
    );
    this.detailsLoadingEnrichment = page.testSubj.locator(
      'securitySolutionFlyoutThreatIntelligenceDetailsLoadingEnrichment'
    );
    this.detailsEnrichedSection = page.testSubj.locator(
      'securitySolutionFlyoutThreatIntelligenceDetailsEnrichedWithThreatIntel'
    );
    this.detailsRangePicker = page.testSubj.locator(
      'securitySolutionFlyoutThreatIntelligenceDetailsEnrichmentRangePicker'
    );
    this.detailsAccordions = page.testSubj.locator('enrichementAccordion');
    this.detailsNoEnrichmentFound = page.testSubj.locator(
      'securitySolutionFlyoutThreatIntelligenceDetailsNoEnrichmentFound'
    );
    this.detailsSections = page.locator(
      '[data-test-subj^="securitySolutionFlyoutThreatIntelligenceDetails"]'
    );
    this.toolsFlyoutTitle = page.testSubj.locator('securitySolutionFlyoutToolsFlyoutHeaderTitle');
    this.toolsFlyoutTitleAlertIcon = page.testSubj.locator(
      'securitySolutionFlyoutToolsFlyoutHeaderTitleIcon'
    );
  }

  /** Return the detail table for the enrichment accordion at the given zero-based index. */
  detailsAccordionTable(index: number): Locator {
    return this.page.testSubj.locator(
      `securitySolutionFlyoutThreatIntelligenceDetailsEnrichmentAccordionTable-${index}`
    );
  }
}
