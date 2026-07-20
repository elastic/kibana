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

// Anomalies tab button in entity details left panel
// (defined in entity_details/shared/components/test_ids.ts via the flyout PREFIX)
const ANOMALIES_TAB_BUTTON_TEST_ID = 'securitySolutionFlyoutAnomaliesTab' as const;

// ExpandablePanel title link — clicking it opens the entity details left panel
// The suffix 'TitleLink' is appended by ExpandablePanel to the data-test-subj prop.
const ANOMALIES_SECTION_EXPANDABLE_PANEL_OUTER_PANEL_TEST_ID =
  `${ANOMALIES_SECTION_EXPANDABLE_PANEL_TEST_ID}Panel` as const;
const ANOMALIES_SECTION_EXPANDABLE_PANEL_TITLE_LINK_TEST_ID =
  `${ANOMALIES_SECTION_EXPANDABLE_PANEL_TEST_ID}TitleLink` as const;

// AnomaliesTab — left panel tab content sections
const ANOMALIES_TAB_CONTENT_TEST_ID = 'entity-anomalies-tab' as const;
const ANOMALIES_TAB_ATTACK_CHAIN_TEST_ID = 'entity-anomalies-tab-attack-chain' as const;
const ANOMALIES_TAB_TIMELINE_TEST_ID = 'entity-anomalies-tab-timeline' as const;
const ANOMALIES_TAB_TABLE_TEST_ID = 'entity-anomalies-tab-table' as const;
const ANOMALIES_TAB_TABLE_GRID_TEST_ID = 'entity-anomalies-tab-table-grid' as const;
const ANOMALIES_TAB_MANAGE_JOBS_BUTTON_TEST_ID = 'entity-anomalies-tab-manage-jobs-button' as const;

// AnomalyTabTableSection — left panel anomalies table row controls
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
 * Rison-encoded flyout URL parameter that opens the host entity right panel.
 * Entity store v2 is off by default so entityId drives the anomaly lookup.
 */
export const HOST_RIGHT_PANEL_FLYOUT_PARAM = `(preview:!(),right:(id:host-panel,params:(contextID:host-panel,entityId:${HOST_FLYOUT_ENTITY_ID},hostName:${HOST_FLYOUT_HOST_NAME},isPreviewMode:!f,scopeId:alerts-page)))`;

/**
 * Rison-encoded flyout URL parameter that opens both the host entity right panel
 * and the host details left panel (entity details view).
 */
export const HOST_BOTH_PANELS_FLYOUT_PARAM = `(left:(id:host_details,params:(entityId:${HOST_FLYOUT_ENTITY_ID},entityStoreEntityId:${HOST_FLYOUT_ENTITY_ID},hostName:${HOST_FLYOUT_HOST_NAME},isRiskScoreExist:!f,scopeId:alerts-page)),preview:!(),right:(id:host-panel,params:(contextID:host-panel,entityId:${HOST_FLYOUT_ENTITY_ID},hostName:${HOST_FLYOUT_HOST_NAME},isPreviewMode:!f,scopeId:alerts-page)))`;

export class EntityFlyoutAnomaliesPage {
  // Right panel — host panel header (always rendered; used as page-ready signal)
  public readonly hostPanelHeader: Locator;

  // Right panel — anomalies section
  public readonly anomaliesSection: Locator;
  public readonly anomaliesSectionButton: Locator;
  public readonly anomaliesExpandablePanel: Locator;
  public readonly anomaliesRecentTable: Locator;

  // Left panel — anomalies tab button
  public readonly anomaliesTab: Locator;

  // Left panel — anomalies tab content sections
  public readonly anomaliesTabContent: Locator;
  public readonly anomaliesTabAttackChain: Locator;
  public readonly anomaliesTabTimeline: Locator;
  public readonly anomaliesTabTable: Locator;
  public readonly anomaliesTabTableGrid: Locator;
  public readonly anomaliesTabManageJobsButton: Locator;
  public readonly anomaliesExpandablePanelTitleLink: Locator;

  // Left panel — anomalies table row controls
  public readonly rowExpandButton: Locator;
  public readonly expandedRowDescription: Locator;
  public readonly rowActionsButton: Locator;

  // Left panel — attack chain tactic filter
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
    this.anomaliesTab = this.page.testSubj.locator(ANOMALIES_TAB_BUTTON_TEST_ID);
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

  async clickAnomaliesTab() {
    await this.anomaliesTab.click();
    await this.anomaliesTabContent.waitFor({ state: 'visible' });
  }

  async clickAnomaliesCountLink() {
    // The anomalies section sits below the entity risk contributions section in the right
    // panel and may be off-screen. Wait for the expandable panel to be in the DOM (anomaly
    // data has loaded), then click.
    await this.anomaliesExpandablePanel.waitFor({ state: 'attached' });
    // In rare cases the entity store resolves fast enough that the flyout auto-navigates to
    // both panels before this click fires. EUI's panel slide-in uses CSS transform, so the
    // anomalies tab is already Playwright-visible during the animation. Skip the click if so.
    if (!(await this.anomaliesTab.isVisible())) {
      // noWaitAfter: true skips Playwright's post-click navigation wait — the URL update that
      // opens the left panel triggers unmocked API calls that keep the tracker pending.
      await this.anomaliesExpandablePanelTitleLink.click({ noWaitAfter: true });
    }
    await this.anomaliesTab.waitFor({ state: 'visible' });
  }

  /**
   * Locator for the attack chain dot representing the given MITRE tactic
   * (e.g. "Credential Access") within the Anomalies tab. Clicking it toggles
   * that tactic as the tab's active filter.
   *
   * Scoped to anomaliesTabAttackChain: when both panels are open, the right
   * panel's overview also renders a (non-interactive) MITRE chain with the
   * same per-tactic test-id, so an unscoped locator would match both.
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

  async selectMitreTactic(tactic: string) {
    await this.getMitreTacticDot(tactic).click();
  }

  async clearMitreTacticFilter() {
    await this.mitreTacticClearChip.click();
  }

  async expandAnomalyRow() {
    await this.rowExpandButton.click();
    await this.expandedRowDescription.waitFor({ state: 'visible' });
  }

  async openRowActionsMenu() {
    await this.anomaliesTabTableGrid.waitFor({ state: 'visible' });
    // noWaitAfter: true skips Playwright's post-click navigation wait — opening the popover
    // triggers a URL update from the flyout's state management that Playwright misidentifies
    // as a pending navigation. The caller's getRowAction assertions are the real check.
    await this.rowActionsButton.click({ noWaitAfter: true });
  }

  /**
   * Navigate to entity analytics page with the host entity right panel flyout open.
   * Waits for the host panel header to confirm the flyout has rendered.
   */
  async navigateToHostRightPanel() {
    await this.page.gotoApp('security/entity_analytics_home_page', {
      params: { flyout: HOST_RIGHT_PANEL_FLYOUT_PARAM },
    });
    await this.hostPanelHeader.waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Navigate to entity analytics page with both the host entity right panel and
   * entity details left panel open.
   * Waits for the host panel header to confirm the flyout has rendered.
   */
  async navigateToHostBothPanels() {
    await this.page.gotoApp('security/entity_analytics_home_page', {
      params: { flyout: HOST_BOTH_PANELS_FLYOUT_PARAM },
    });
    await this.hostPanelHeader.waitFor({ state: 'visible', timeout: 30000 });
  }
}
