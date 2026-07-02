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

/**
 * Mock response returned by the anomaly overview API when the entity has anomalies.
 */
export const MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES = {
  entityId: HOST_FLYOUT_ENTITY_ID,
  entityType: 'host',
  totalAnomaliesCount: 5,
  tacticCounts: { 'Credential Access': 3, 'Initial Access': 2 },
  anomalyByTimeBucket: [
    { timestamp: '2025-01-01T00:00:00.000Z', maxScore: 75.5, threatTactics: ['Credential Access'] },
  ],
  recentAnomalies: [
    {
      jobId: 'auth_high_count_logon_events_ea',
      jobName: 'Spike in Logon Events',
      recordId: 'record-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      recordScore: 75.5,
      anomalousValue: 'high login count',
    },
  ],
  from: 1704067200000,
  to: 1735689600000,
};

/**
 * Mock response returned by the anomaly overview API when the entity has anomalies
 * but none are associated with any MITRE tactic.
 */
export const MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES_NO_TACTICS = {
  ...MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  tacticCounts: {},
  anomalyByTimeBucket: [],
};

/**
 * Mock response returned by the anomaly overview API when the entity has no anomalies.
 */
export const MOCK_ANOMALY_OVERVIEW_EMPTY = {
  entityId: HOST_FLYOUT_ENTITY_ID,
  entityType: 'host',
  totalAnomaliesCount: 0,
  tacticCounts: {},
  anomalyByTimeBucket: [],
  recentAnomalies: [],
  from: 1704067200000,
  to: 1735689600000,
};

/**
 * Mock response returned by the anomaly summary API.
 */
export const MOCK_ANOMALY_SUMMARY = {
  entity_id: HOST_FLYOUT_ENTITY_ID,
  entity_type: 'host',
  anomalies: [
    {
      jobId: 'auth_high_count_logon_events_ea',
      jobName: 'Spike in Logon Events',
      recordId: 'record-1',
      timestamp: '2025-01-01T00:00:00.000Z',
      recordScore: 75.5,
      actual: [100],
      typical: [10],
      baselineValues: ['10'],
      anomalousValue: 'high login count',
      detectorFunction: 'count',
      threatTactics: ['Credential Access'],
      threatTechniques: ['Brute Force'],
    },
  ],
  total: 1,
  page: 1,
  page_size: 10,
};

/**
 * Second anomaly summary record, associated with the Initial Access tactic.
 * Paired with MOCK_ANOMALY_SUMMARY's Credential Access record to exercise
 * MITRE tactic filtering on the Anomalies tab.
 */
const SECOND_TACTIC_ANOMALY = {
  jobId: 'rare_process_by_host_linux_ea',
  jobName: 'Unusual Process For a Linux Host',
  recordId: 'record-2',
  timestamp: '2025-01-02T00:00:00.000Z',
  recordScore: 60,
  actual: [1],
  typical: [0],
  baselineValues: ['0'],
  anomalousValue: 'new process observed',
  detectorFunction: 'rare',
  threatTactics: ['Initial Access'],
  threatTechniques: ['Exploit Public-Facing Application'],
};

/**
 * Mock anomaly summary response with records for two distinct MITRE tactics
 * (Credential Access and Initial Access), used to verify tactic filtering.
 */
export const MOCK_ANOMALY_SUMMARY_MULTI_TACTIC = {
  ...MOCK_ANOMALY_SUMMARY,
  anomalies: [...MOCK_ANOMALY_SUMMARY.anomalies, SECOND_TACTIC_ANOMALY],
  total: 2,
};

/**
 * Mock anomaly overview response reflecting only the Credential Access tactic,
 * as returned once the Anomalies tab filters by that tactic.
 */
export const MOCK_ANOMALY_OVERVIEW_FILTERED_BY_CREDENTIAL_ACCESS = {
  ...MOCK_ANOMALY_OVERVIEW_WITH_ANOMALIES,
  totalAnomaliesCount: 3,
  tacticCounts: { 'Credential Access': 3 },
};

/**
 * Mock anomaly summary response containing only the Credential Access record,
 * as returned once the Anomalies tab filters by that tactic.
 */
export const MOCK_ANOMALY_SUMMARY_FILTERED_BY_CREDENTIAL_ACCESS = {
  ...MOCK_ANOMALY_SUMMARY,
  total: 1,
};

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
    await this.anomaliesExpandablePanelTitleLink.click();
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
    await this.rowActionsButton.click();
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
