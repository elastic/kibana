/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage, ScoutTestConfig } from '@kbn/scout';

const PAGE_URL = 'securitySolutionUI';
const ATTACKS_PAGE_URL = 'security/attacks';
const ATTACK_DISCOVERY_PAGE_URL = 'security/attack_discovery';
const STATEFUL_ALERTS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alerts';
const STATEFUL_DETECTIONS_NAV_ITEM_SELECTOR = 'solutionSideNavItemLink-alert_detections';
const STATEFUL_DETECTIONS_NAV_ITEM_BUTTON_SELECTOR = 'solutionSideNavItemButton-alert_detections';
const STATEFUL_ATTACKS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-attacks';
const STATEFUL_ALERTS_NAV_PANEL_ITEM_SELECTOR = 'solutionSideNavPanelLink-alerts';

const SERVERLESS_ALERTS_NAV_ITEM_DEEP_LINK_ID = 'securitySolutionUI:alerts';
const SERVERLESS_DETECTIONS_NAV_ITEM_ID = 'securityGroup:alertDetections';
const SERVERLESS_ATTACKS_NAV_PANEL_ITEM_DEEP_LINK_ID = 'securitySolutionUI:attacks';
const SERVERLESS_ALERTS_NAV_PANEL_ITEM_DEEP_LINK_ID = 'securitySolutionUI:alerts';
const ATTACKS_PAGE_CONTENT_TEST_ID = 'attacks-page-content';
const ATTACKS_PAGE_ACTIONS_TEST_ID = 'attacks-page-actions';
const ATTACKS_PAGE_SEARCH_BAR_TEST_ID = 'attacks-page-search-bar';
const ATTACKS_PAGE_STANDARD_FILTERS_TEST_ID = 'attacks-page-standard-filters';
const ATTACKS_PAGE_ASSIGNEE_FILTER_TEST_ID = 'attacks-page-assignee-filter';
const ATTACKS_PAGE_CONNECTOR_FILTER_TEST_ID = 'attacks-page-connector-filter';
const ATTACKS_KPIS_SECTION_TEST_ID = 'attacks-kpis-section';
const ATTACKS_SUMMARY_VIEW_TEST_ID = 'summary-view-content';
const ATTACKS_LIST_PANEL_TEST_ID = 'attacksListPanel';
const ATTACKS_VOLUME_PANEL_TEST_ID = 'attacksVolumePanel';
const ATTACKS_LIST_TABLE_TEST_ID = 'attacksListTable';
const ATTACKS_PAGE_TABLE_SECTION_TEST_ID = 'attacks-page-table-section';
const SCHEDULE_BUTTON_TEST_ID = 'schedule';
const SETTINGS_FLYOUT_TEST_ID = 'settingsFlyout';
const SCHEDULES_TABLE_TEST_ID = 'schedulesTable';
const ATTACK_DETAILS_FLYOUT_BODY_TEST_ID = 'attack-details-flyout-body';
const FILTER_BY_ASSIGNEES_BUTTON_TEST_ID = 'filter-popover-button-assignees';
const CONNECTOR_FILTER_BUTTON_TEST_ID = 'connectorFilterButton';
const EXPAND_ATTACK_BUTTON_TEST_ID = 'expand-attack-button';
const SCHEDULE_BUTTON_TEST_ID_TABLE = 'scheduleButton';
const SCHEDULE_DETAILS_FLYOUT_TEST_ID = 'scheduleDetailsFlyout';
const QUERY_TOGGLE_HEADER_TEST_ID = 'query-toggle-header';
const ATTACK_SUBTITLE_TEST_ID = 'attack-subtitle';
const ATTACK_RUN_BY_AVATAR_TEST_ID = 'attack-run-by-avatar';

export class DetectionsAttackDiscoveryPage {
  public readonly standaloneAlertsNavItem: Locator;
  public readonly detectionsNavItem: Locator;
  public readonly detectionsPanelAlertsNavItem: Locator;
  public readonly detectionsPanelAttacksNavItem: Locator;
  public readonly detectionsNavItemButton: Locator;
  public readonly attacksPageContent: Locator;
  public readonly attacksPageActions: Locator;
  public readonly attacksPageSearchBar: Locator;
  public readonly attacksPageStandardFilters: Locator;
  public readonly attacksPageAssigneeFilter: Locator;
  public readonly attacksPageConnectorFilter: Locator;
  public readonly attacksKpisSection: Locator;
  public readonly kpisSectionToggleButton: Locator;
  public readonly attacksSummaryView: Locator;
  public readonly attacksListPanel: Locator;
  public readonly attacksVolumePanel: Locator;
  public readonly attacksListTable: Locator;
  public readonly attacksTableSection: Locator;
  public readonly scheduleButton: Locator;
  public readonly settingsFlyout: Locator;
  public readonly scheduleDetailsFlyout: Locator;
  public readonly schedulesTable: Locator;
  public readonly attackDetailsFlyoutBody: Locator;
  public readonly assigneesFilterButton: Locator;
  public readonly connectorFilterButton: Locator;
  public readonly tableExpandAttackDetailsButtons: Locator;
  public readonly tableScheduleButtons: Locator;
  public readonly settingsButton: Locator;
  public readonly generateButton: Locator;
  public readonly runButton: Locator;
  public readonly globalToastList: Locator;
  public readonly attackSubtitle: Locator;
  public readonly attackRunByAvatar: Locator;
  public readonly manualAttackSubtitle: Locator;

  constructor(private readonly page: ScoutPage, _config: ScoutTestConfig) {
    this.attacksPageContent = this.page.testSubj.locator(ATTACKS_PAGE_CONTENT_TEST_ID);
    this.attacksPageActions = this.page.testSubj.locator(ATTACKS_PAGE_ACTIONS_TEST_ID);
    this.attacksPageSearchBar = this.page.testSubj.locator(ATTACKS_PAGE_SEARCH_BAR_TEST_ID);
    this.attacksPageStandardFilters = this.page.testSubj.locator(
      ATTACKS_PAGE_STANDARD_FILTERS_TEST_ID
    );
    this.attacksPageAssigneeFilter = this.page.testSubj.locator(
      ATTACKS_PAGE_ASSIGNEE_FILTER_TEST_ID
    );
    this.attacksPageConnectorFilter = this.page.testSubj.locator(
      ATTACKS_PAGE_CONNECTOR_FILTER_TEST_ID
    );
    this.attacksKpisSection = this.page.testSubj.locator(ATTACKS_KPIS_SECTION_TEST_ID);
    this.kpisSectionToggleButton = this.attacksKpisSection.getByTestId(QUERY_TOGGLE_HEADER_TEST_ID);
    this.attacksSummaryView = this.page.testSubj.locator(ATTACKS_SUMMARY_VIEW_TEST_ID);
    this.attacksListPanel = this.page.testSubj.locator(ATTACKS_LIST_PANEL_TEST_ID);
    this.attacksVolumePanel = this.page.testSubj.locator(ATTACKS_VOLUME_PANEL_TEST_ID);
    this.attacksListTable = this.page.testSubj.locator(ATTACKS_LIST_TABLE_TEST_ID);
    this.attacksTableSection = this.page.testSubj.locator(ATTACKS_PAGE_TABLE_SECTION_TEST_ID);
    this.scheduleButton = this.page.testSubj.locator(SCHEDULE_BUTTON_TEST_ID);
    this.settingsFlyout = this.page.testSubj.locator(SETTINGS_FLYOUT_TEST_ID);
    this.scheduleDetailsFlyout = this.page.testSubj.locator(SCHEDULE_DETAILS_FLYOUT_TEST_ID);
    this.schedulesTable = this.page.testSubj.locator(SCHEDULES_TABLE_TEST_ID);
    this.attackDetailsFlyoutBody = this.page.testSubj.locator(ATTACK_DETAILS_FLYOUT_BODY_TEST_ID);
    this.assigneesFilterButton = this.page.testSubj.locator(FILTER_BY_ASSIGNEES_BUTTON_TEST_ID);
    this.connectorFilterButton = this.page.testSubj.locator(CONNECTOR_FILTER_BUTTON_TEST_ID);
    this.tableExpandAttackDetailsButtons = this.attacksTableSection.getByTestId(
      EXPAND_ATTACK_BUTTON_TEST_ID
    );
    this.tableScheduleButtons = this.attacksTableSection.getByTestId(SCHEDULE_BUTTON_TEST_ID_TABLE);
    this.settingsButton = this.page.testSubj.locator('settings');
    this.generateButton = this.page.testSubj.locator('generate');
    this.runButton = this.page.testSubj.locator('run');
    this.globalToastList = this.page.testSubj.locator('globalToastList');
    this.attackSubtitle = this.attacksTableSection.getByTestId(ATTACK_SUBTITLE_TEST_ID);
    this.manualAttackSubtitle = this.attackSubtitle.filter({ hasText: 'Run by:' });
    this.attackRunByAvatar = this.attacksTableSection.getByTestId(ATTACK_RUN_BY_AVATAR_TEST_ID);

    if (_config.serverless) {
      this.standaloneAlertsNavItem = this.page.testSubj.locator(
        `~nav-item-deepLinkId-${SERVERLESS_ALERTS_NAV_ITEM_DEEP_LINK_ID}`
      );
      this.detectionsNavItem = this.page.testSubj.locator(
        `~nav-item-id-${SERVERLESS_DETECTIONS_NAV_ITEM_ID}`
      );
      this.detectionsPanelAlertsNavItem = this.page.testSubj.locator(
        `~nav-item-deepLinkId-${SERVERLESS_ALERTS_NAV_PANEL_ITEM_DEEP_LINK_ID}`
      );
      this.detectionsPanelAttacksNavItem = this.page.testSubj.locator(
        `~nav-item-deepLinkId-${SERVERLESS_ATTACKS_NAV_PANEL_ITEM_DEEP_LINK_ID}`
      );
      this.detectionsNavItemButton = this.page.testSubj.locator(
        `~nav-item-id-${SERVERLESS_DETECTIONS_NAV_ITEM_ID}`
      );
      return;
    }

    this.standaloneAlertsNavItem = this.page.testSubj.locator(STATEFUL_ALERTS_NAV_ITEM_SELECTOR);
    this.detectionsNavItem = this.page.testSubj.locator(STATEFUL_DETECTIONS_NAV_ITEM_SELECTOR);
    this.detectionsPanelAlertsNavItem = this.page.testSubj.locator(
      STATEFUL_ALERTS_NAV_PANEL_ITEM_SELECTOR
    );
    this.detectionsPanelAttacksNavItem = this.page.testSubj.locator(
      STATEFUL_ATTACKS_NAV_PANEL_ITEM_SELECTOR
    );
    this.detectionsNavItemButton = this.page.testSubj.locator(
      STATEFUL_DETECTIONS_NAV_ITEM_BUTTON_SELECTOR
    );
  }

  async navigate() {
    await this.page.gotoApp(PAGE_URL);
  }

  async navigateToAttacksPage() {
    await this.page.gotoApp(ATTACKS_PAGE_URL);

    // The attacks wrapper shows a skeleton until the data view finishes loading; only then does
    // AttacksPageContent mount and expose attacks-page-content. This wait confirms real UI, not the loader.
    await this.attacksPageContent.waitFor({ state: 'visible', timeout: 30_000 });

    // The search bar is rendered via FiltersGlobal into the global KQL header portal, so it can
    // appear after the main content tree. SiemSearchBar also skips rendering until index patterns
    // are ready. Waiting here avoids races that show up on slower CI but not locally.
    await this.attacksPageSearchBar.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async navigateToAttackDiscoveryPage() {
    await this.page.gotoApp(ATTACK_DISCOVERY_PAGE_URL);
    await this.runButton.waitFor({ state: 'visible', timeout: 30_000 });
  }

  async expandDetectionsSection() {
    await this.detectionsNavItem.click();
  }

  async collapseKpisSection() {
    if (await this.attacksSummaryView.isVisible()) {
      await this.kpisSectionToggleButton.click();
      await this.attacksSummaryView.waitFor({ state: 'hidden' });
    }
  }

  async openScheduleFlyout() {
    await this.scheduleButton.click();
    await this.settingsFlyout.waitFor({ state: 'visible' });
    await this.schedulesTable.waitFor({ state: 'visible' });
  }

  async openFirstAttackDetailsFromTable() {
    const [firstExpandAttackButton] = await this.tableExpandAttackDetailsButtons.all();

    if (!firstExpandAttackButton) {
      throw new Error('No attack details expand button found');
    }

    await firstExpandAttackButton.click();
    await this.attackDetailsFlyoutBody.waitFor({ state: 'visible' });
  }

  async openFirstScheduleDetailsFromTable() {
    const [firstScheduleButton] = await this.tableScheduleButtons.all();

    if (!firstScheduleButton) {
      throw new Error('No schedule button found');
    }

    await firstScheduleButton.click();
    await this.scheduleDetailsFlyout.waitFor({ state: 'visible' });
  }
}
