/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

// All values below mirror public/entity_analytics/components/anomalies/test_ids.ts in
// @kbn/security-solution-plugin. Cannot import directly to avoid a cross-package dependency.

// AnomaliesSection — right panel accordion
const ANOMALIES_SECTION_TEST_ID = 'entity-anomalies-flyout-section-data-test-subj' as const;
const ANOMALIES_SECTION_ACCORDION_BUTTON_TEST_ID =
  'entity-anomalies-flyout-section-accordion-button' as const;
const ANOMALIES_SECTION_EXPANDABLE_PANEL_TEST_ID =
  'entity-anomalies-flyout-section-expandable-panel' as const;
const ANOMALIES_RECENT_TABLE_TEST_ID = 'entity-anomalies-flyout-section-recent-table' as const;

// Host right panel header — present whenever the host panel is rendered; used as page-ready signal
const HOST_PANEL_HEADER_TEST_ID = 'host-panel-header' as const;

// Anomaly insights tool flyout body
// (mirrors public/flyout_v2/entity/shared/tools/anomaly_insights/test_ids.ts)
const ANOMALY_INSIGHTS_TOOL_TEST_ID = 'anomalyInsightsTool' as const;

// ExpandablePanel title link — clicking it opens the anomaly insights tool
// The suffix 'TitleLink' is appended by ExpandablePanel to the data-test-subj prop.
const ANOMALIES_SECTION_EXPANDABLE_PANEL_OUTER_PANEL_TEST_ID =
  `${ANOMALIES_SECTION_EXPANDABLE_PANEL_TEST_ID}Panel` as const;
const ANOMALIES_SECTION_EXPANDABLE_PANEL_TITLE_LINK_TEST_ID =
  `${ANOMALIES_SECTION_EXPANDABLE_PANEL_TEST_ID}TitleLink` as const;

// AnomaliesTab — content sections rendered inside the anomaly insights tool
const ANOMALIES_TAB_CONTENT_TEST_ID = 'entity-anomalies-tab' as const;
const ANOMALIES_TAB_ATTACK_CHAIN_TEST_ID = 'entity-anomalies-tab-attack-chain' as const;
const ANOMALIES_TAB_TIMELINE_TEST_ID = 'entity-anomalies-tab-timeline' as const;
const ANOMALIES_TAB_TABLE_TEST_ID = 'entity-anomalies-tab-table' as const;
const ANOMALIES_TAB_TABLE_GRID_TEST_ID = 'entity-anomalies-tab-table-grid' as const;
const ANOMALIES_TAB_MANAGE_JOBS_BUTTON_TEST_ID = 'entity-anomalies-tab-manage-jobs-button' as const;

// AnomalyTabTableSection — anomalies table row controls
const ANOMALIES_TABLE_ROW_EXPAND_BUTTON_TEST_ID =
  'entity-anomalies-table-row-expand-button' as const;
const ANOMALIES_TABLE_EXPANDED_ROW_DESCRIPTION_TEST_ID =
  'entity-anomalies-table-expanded-row-description' as const;
const ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID =
  'entity-anomalies-table-row-actions-button' as const;
const ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX = 'entity-anomalies-table-row-action-' as const;

// MitreTacticDot — attack chain tactic dots and the active-filter "clear" chip
const MITRE_TACTIC_DOT_TEST_ID_PREFIX = 'mitreTacticDot-' as const;
const MITRE_TACTIC_CLEAR_CHIP_TEST_ID = 'mitreTacticDotV3HoverChipClear' as const;

// Rison-encoded flyout state constants — host entity panel, entity store v2 disabled
export const HOST_FLYOUT_ENTITY_ID = 'test-entity-id';
export const HOST_FLYOUT_HOST_NAME = 'test-host';

/**
 * Rison-encoded legacy flyout URL parameter for the host entity flyout. The permanent legacy URL
 * interop translates it to the v2 host flyout. Entity store v2 is off by default so entityId
 * drives the anomaly lookup.
 */
export const HOST_FLYOUT_PARAM = `(preview:!(),right:(id:host-panel,params:(contextID:host-panel,entityId:${HOST_FLYOUT_ENTITY_ID},hostName:${HOST_FLYOUT_HOST_NAME},isPreviewMode:!f,scopeId:alerts-page)))`;

export class EntityFlyoutAnomaliesPage {
  // Host flyout — header (always rendered; used as page-ready signal)
  public readonly hostPanelHeader: Locator;

  // Host flyout — anomalies section
  public readonly anomaliesSection: Locator;
  public readonly anomaliesSectionButton: Locator;
  public readonly anomaliesExpandablePanel: Locator;
  public readonly anomaliesRecentTable: Locator;

  // Anomaly insights tool
  public readonly anomaliesTool: Locator;

  // Anomaly insights tool — content sections
  public readonly anomaliesTabContent: Locator;
  public readonly anomaliesTabAttackChain: Locator;
  public readonly anomaliesTabTimeline: Locator;
  public readonly anomaliesTabTable: Locator;
  public readonly anomaliesTabTableGrid: Locator;
  public readonly anomaliesTabManageJobsButton: Locator;
  public readonly anomaliesExpandablePanelTitleLink: Locator;

  // Anomaly insights tool — anomalies table row controls
  public readonly rowExpandButton: Locator;
  public readonly expandedRowDescription: Locator;
  public readonly rowActionsButton: Locator;

  // Anomaly insights tool — attack chain tactic filter
  public readonly mitreTacticClearChip: Locator;

  constructor(private readonly page: ScoutPage) {
    this.hostPanelHeader = this.page.testSubj.locator(HOST_PANEL_HEADER_TEST_ID);
    this.anomaliesSection = this.page.testSubj.locator(ANOMALIES_SECTION_TEST_ID);
    this.anomaliesSectionButton = this.page.testSubj.locator(
      ANOMALIES_SECTION_ACCORDION_BUTTON_TEST_ID
    );
    this.anomaliesExpandablePanel = this.page.testSubj.locator(
      ANOMALIES_SECTION_EXPANDABLE_PANEL_OUTER_PANEL_TEST_ID
    );
    this.anomaliesExpandablePanelTitleLink = this.page.testSubj.locator(
      ANOMALIES_SECTION_EXPANDABLE_PANEL_TITLE_LINK_TEST_ID
    );
    this.anomaliesRecentTable = this.page.testSubj.locator(ANOMALIES_RECENT_TABLE_TEST_ID);
    this.anomaliesTool = this.page.testSubj.locator(ANOMALY_INSIGHTS_TOOL_TEST_ID);
    this.anomaliesTabContent = this.page.testSubj.locator(ANOMALIES_TAB_CONTENT_TEST_ID);
    this.anomaliesTabAttackChain = this.page.testSubj.locator(ANOMALIES_TAB_ATTACK_CHAIN_TEST_ID);
    this.anomaliesTabTimeline = this.page.testSubj.locator(ANOMALIES_TAB_TIMELINE_TEST_ID);
    this.anomaliesTabTable = this.page.testSubj.locator(ANOMALIES_TAB_TABLE_TEST_ID);
    this.anomaliesTabTableGrid = this.page.testSubj.locator(ANOMALIES_TAB_TABLE_GRID_TEST_ID);
    this.anomaliesTabManageJobsButton = this.page.testSubj.locator(
      ANOMALIES_TAB_MANAGE_JOBS_BUTTON_TEST_ID
    );
    this.rowExpandButton = this.page.testSubj.locator(ANOMALIES_TABLE_ROW_EXPAND_BUTTON_TEST_ID);
    this.expandedRowDescription = this.page.testSubj.locator(
      ANOMALIES_TABLE_EXPANDED_ROW_DESCRIPTION_TEST_ID
    );
    this.rowActionsButton = this.page.testSubj.locator(ANOMALIES_TABLE_ROW_ACTIONS_BUTTON_TEST_ID);
    this.mitreTacticClearChip = this.page.testSubj.locator(MITRE_TACTIC_CLEAR_CHIP_TEST_ID);
  }

  /**
   * Click the anomalies section title link in the host flyout, which opens the anomaly insights
   * tool, and wait for the tool content to render.
   */
  async clickAnomaliesCountLink() {
    // Attached rather than visible: the section sits below risk contributions and may be
    // off-screen until the click scrolls to it.
    await this.anomaliesExpandablePanel.waitFor({ state: 'attached' });
    // noWaitAfter: the URL update that opens the tool triggers unmocked API calls that keep
    // Playwright's navigation tracker pending.
    await this.anomaliesExpandablePanelTitleLink.click({ noWaitAfter: true, timeout: 30000 });
    await this.anomaliesTool.waitFor({ state: 'visible' });
    await this.anomaliesTabContent.waitFor({ state: 'visible' });
  }

  /**
   * Locator for the attack chain dot representing the given MITRE tactic
   * (e.g. "Credential Access") within the Anomalies tab. Clicking it toggles
   * that tactic as the tab's active filter.
   *
   * Scoped to anomaliesTabAttackChain: the host flyout's anomalies section,
   * still open next to the tool, also renders a (non-interactive) MITRE chain
   * with the same per-tactic test-id, so an unscoped locator would match both.
   */
  getMitreTacticDot(tactic: string): Locator {
    return this.anomaliesTabAttackChain.locator(
      `[data-test-subj="${MITRE_TACTIC_DOT_TEST_ID_PREFIX}${tactic.replace(/\s+/g, '')}"]`
    );
  }

  /**
   * Locator for a row actions menu item by its action key
   * (e.g. "add-to-timeline", "view-in-discover", "view-in-single-metric-viewer").
   */
  getRowAction(actionKey: string): Locator {
    return this.page.testSubj.locator(`${ANOMALIES_TABLE_ROW_ACTION_TEST_ID_PREFIX}${actionKey}`);
  }

  /**
   * Click a row-actions menu item. dispatchEvent bypasses Playwright's obstruction
   * check: the URL change from openRowActionsMenu re-renders the flyout and transiently
   * repositions the popover, covering the menu item's center point. The click event
   * source is EuiContextMenuItem (SecuritySolution/public/entity_analytics/components/anomalies).
   */
  async clickRowAction(actionKey: string) {
    await this.getRowAction(actionKey).dispatchEvent('click');
  }

  async selectMitreTactic(tactic: string) {
    // dispatchEvent bypasses Playwright's obstruction check: the tactic dot is briefly
    // occluded after scrollIntoView by the adjacent MitreTacticDotV3 hover chip overlay
    // (SecuritySolution/public/entity_analytics/components/anomalies/MitreTacticDot).
    await this.getMitreTacticDot(tactic).dispatchEvent('click');
  }

  async clearMitreTacticFilter() {
    // dispatchEvent: same occlusion race as selectMitreTactic — the hover chip is
    // briefly covered after scroll by the MitreTacticDotV3 overlay.
    await this.mitreTacticClearChip.dispatchEvent('click');
  }

  async expandAnomalyRow() {
    await this.rowExpandButton.click();
    await this.expandedRowDescription.waitFor({ state: 'visible' });
  }

  async openRowActionsMenu() {
    await this.anomaliesTabTableGrid.waitFor({ state: 'visible' });
    // dispatchEvent: the row-actions button sits inside the anomalies table grid; after scroll
    // it is transiently covered by an adjacent element. Also avoids noWaitAfter — the URL
    // update from the flyout's state management is not awaited by dispatchEvent anyway.
    await this.rowActionsButton.dispatchEvent('click');
  }

  /**
   * Navigate to entity analytics page with the host entity flyout open.
   * Waits for the host panel header to confirm the flyout has rendered.
   */
  async navigateToHostFlyout() {
    await this.page.gotoApp('security/entity_analytics_home_page', {
      params: { flyout: HOST_FLYOUT_PARAM },
    });
    await this.hostPanelHeader.waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Navigate to entity analytics page with the host entity flyout open, then open the
   * anomaly insights tool from its anomalies section.
   */
  async navigateToHostAnomaliesTool() {
    await this.navigateToHostFlyout();
    await this.clickAnomaliesCountLink();
  }
}
