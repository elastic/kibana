/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

// Inlined to avoid a cross-package dep on @kbn/cloud-security-posture-graph,
// which would create a project-reference cycle through entity_store's scout deps.
// Mirrors GRAPH_INVESTIGATION_TEST_ID / GRAPH_ENTITY_NODE_ID in
// @kbn/cloud-security-posture-graph/src/components/test_ids.
const GRAPH_INVESTIGATION_TEST_ID = 'cloudSecurityGraphGraphInvestigation' as const;
const GRAPH_ENTITY_NODE_ID = `${GRAPH_INVESTIGATION_TEST_ID}EntityNode` as const;

const VISUALIZATIONS_SECTION_HEADER_TEST_ID = 'securitySolutionFlyoutVisualizationsHeader' as const;
const GRAPH_PREVIEW_TITLE_LINK_TEST_ID = 'securitySolutionFlyoutGraphPreviewTitleLink' as const;

/**
 * Page object for the graph tool of the v2 document flyout (alert / event).
 * Mirrors the navigation in `flyout_v2/document/main/components/visualizations_section.tsx`:
 *   document flyout → Visualizations section → graph preview title link → graph tool flyout.
 */
export class GraphFlyoutPage {
  public visualizationsSectionHeader: Locator;
  public graphPreviewTitleLink: Locator;
  public graphInvestigation: Locator;
  public entityNodes: Locator;

  constructor(private readonly page: ScoutPage) {
    this.visualizationsSectionHeader = this.page.testSubj.locator(
      VISUALIZATIONS_SECTION_HEADER_TEST_ID
    );
    this.graphPreviewTitleLink = this.page.testSubj.locator(GRAPH_PREVIEW_TITLE_LINK_TEST_ID);
    this.graphInvestigation = this.page.testSubj.locator(GRAPH_INVESTIGATION_TEST_ID);
    this.entityNodes = this.page.testSubj.locator(GRAPH_ENTITY_NODE_ID);
  }

  /**
   * Opens the graph tool from the document flyout's graph preview.
   * Assumes the document flyout is already open (alert flyout expanded from the alerts table).
   */
  async openGraphTool(): Promise<void> {
    // The Visualizations section is collapsed by default.
    await this.visualizationsSectionHeader.waitFor({ state: 'visible', timeout: 20_000 });
    await this.visualizationsSectionHeader.click();

    await this.graphPreviewTitleLink.waitFor({ state: 'visible', timeout: 15_000 });
    await this.graphPreviewTitleLink.click();
  }

  /**
   * Waits until the GraphInvestigation root is rendered.
   *
   * Doesn't wait for entity nodes: rendered nodes depend on whether the Graph API
   * found matching events for the originEventIds and whether entity-store enrichment
   * has run — both environment-sensitive. Tests that need DOM-level node assertions
   * should target `entityNodes` / `entityNodeByLabel(...)` themselves.
   */
  async waitForGraphReady(timeout = 30_000): Promise<void> {
    await this.graphInvestigation.waitFor({ state: 'visible', timeout });
  }

  /**
   * Returns a locator for entity nodes whose visible label includes the given text.
   * Used to assert presence/absence of origin-vs-linked actors.
   */
  entityNodeByLabel(label: string): Locator {
    return this.entityNodes.filter({ hasText: label });
  }
}
