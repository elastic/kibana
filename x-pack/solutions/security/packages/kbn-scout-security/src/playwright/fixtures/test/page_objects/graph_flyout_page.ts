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

const EXPAND_DETAILS_BUTTON_TEST_ID = 'securitySolutionFlyoutNavigationExpandDetailButton' as const;
const VISUALIZE_TAB_TEST_ID = 'securitySolutionFlyoutVisualizeTab' as const;
const VISUALIZE_TAB_GRAPH_BUTTON_TEST_ID =
  'securitySolutionFlyoutVisualizeTabGraphVisualizationButton' as const;

/**
 * Page object for the Graph Visualization tab inside the alert/event details left panel.
 * Mirrors the navigation in `flyout/document_details/left/components/graph_visualization.tsx`:
 *   right panel → Expand → left panel → Visualize tab → Graph view subtab.
 */
export class GraphFlyoutPage {
  public expandDetailsButton: Locator;
  public visualizeTab: Locator;
  public graphSubtab: Locator;
  public graphInvestigation: Locator;
  public entityNodes: Locator;

  constructor(private readonly page: ScoutPage) {
    this.expandDetailsButton = this.page.testSubj.locator(EXPAND_DETAILS_BUTTON_TEST_ID);
    this.visualizeTab = this.page.testSubj.locator(VISUALIZE_TAB_TEST_ID);
    this.graphSubtab = this.page.testSubj.locator(VISUALIZE_TAB_GRAPH_BUTTON_TEST_ID);
    this.graphInvestigation = this.page.testSubj.locator(GRAPH_INVESTIGATION_TEST_ID);
    this.entityNodes = this.page.testSubj.locator(GRAPH_ENTITY_NODE_ID);
  }

  /**
   * Walks the flyout from the right panel to the Graph tab inside the left panel.
   * Assumes the right panel is already open (alert flyout expanded from the alerts table).
   */
  async openGraphTab(): Promise<void> {
    await this.expandDetailsButton.waitFor({ state: 'visible', timeout: 20_000 });
    await this.expandDetailsButton.click();

    // Visualize tab is the default left-panel tab after expand, but click defensively
    // in case a stored last-tab preference points elsewhere.
    await this.visualizeTab.waitFor({ state: 'visible', timeout: 15_000 });
    await this.visualizeTab.click();

    await this.graphSubtab.waitFor({ state: 'visible', timeout: 15_000 });
    await this.graphSubtab.click();
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
