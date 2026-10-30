/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Page object for the threat intelligence tool overlay inside the flyout v2 document flyout.
 */
export class ThreatIntelligenceTool {
  /** Title link in the insights threat intelligence panel that opens the tool overlay. */
  public readonly titleLink: Locator;
  /** Count of investigation-time enrichments shown in the insights threat intelligence panel. */
  public readonly enrichedWithThreatIntelligenceCount: Locator;
  /** Investigation-time enrichments section inside the tool overlay. */
  public readonly investigationEnrichmentsSection: Locator;
  /** One accordion per investigation-time enrichment inside the tool overlay. */
  public readonly investigationEnrichments: Locator;

  constructor(page: ScoutPage) {
    this.titleLink = page.testSubj.locator(
      'securitySolutionFlyoutInsightsThreatIntelligenceTitleLink'
    );
    this.enrichedWithThreatIntelligenceCount = page.testSubj.locator(
      'securitySolutionFlyoutInsightsThreatIntelligenceEnrichedWithThreatIntelligenceButton'
    );
    this.investigationEnrichmentsSection = page.testSubj.locator(
      'securitySolutionFlyoutThreatIntelligenceDetailsEnrichedWithThreatIntel'
    );
    this.investigationEnrichments =
      this.investigationEnrichmentsSection.getByTestId('enrichementAccordion');
  }
}
