/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

/**
 * Locators for Timeline page elements
 *
 * This class provides centralized access to all Timeline UI element locators.
 * Organized by feature domain for easy navigation.
 */
export class TimelineLocators {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Main Elements
  // ========================================

  public get timelineFlyout() {
    return this.page.testSubj.locator('timeline-container');
  }

  public get timelinePanel() {
    return this.page.testSubj.locator('timeline-modal-header-panel');
  }

  public get timelineHeader() {
    return this.page.testSubj.locator('timeline-hide-show-container');
  }

  public get closeFlyoutButton() {
    return this.page.testSubj.locator('timeline-modal-header-close-button');
  }

  public get timelineTitle() {
    return this.page.testSubj.locator('timeline-modal-header-title');
  }

  public get timelineBottomBar() {
    return this.page.testSubj.locator('timeline-bottom-bar-container');
  }

  public get activeTimelineButton() {
    return this.page.testSubj.locator('timeline-bottom-bar-title-button');
  }

  // ========================================
  // Query and Search
  // ========================================

  public get queryInput() {
    return this.page.testSubj.locator('timelineQueryInput');
  }

  public get searchOrFilterContainer() {
    return this.page.testSubj.locator('timeline-search-or-filter-search-container');
  }

  public get searchOrFilterSelect() {
    return this.page.testSubj.locator('timeline-select-search-or-filter');
  }

  public get kqlModeSearch() {
    return this.page.testSubj.locator('kqlModePopoverSearch');
  }

  public get kqlModeFilter() {
    return this.page.testSubj.locator('kqlModePopoverFilter');
  }

  public get showQueryBarMenuButton() {
    return this.timelineFlyout.locator('[data-test-subj="showQueryBarMenu"]');
  }

  public get switchQueryLanguageButton() {
    return this.page.testSubj.locator('switchQueryLanguageButton');
  }

  public get kqlLanguageButton() {
    return this.page.testSubj.locator('kqlLanguageMenuItem');
  }

  public get luceneLanguageButton() {
    return this.page.testSubj.locator('luceneLanguageMenuItem');
  }

  // ========================================
  // Tabs
  // ========================================

  public get queryTabButton() {
    return this.page.testSubj.locator('timelineTabs-query');
  }

  public get notesTabButton() {
    return this.page.testSubj.locator('timelineTabs-notes');
  }

  public get correlationTabButton() {
    return this.page.testSubj.locator('timelineTabs-eql');
  }

  public get esqlTabButton() {
    return this.page.testSubj.locator('timelineTabs-esql');
  }

  public get correlationInput() {
    return this.page.testSubj.locator('eqlQueryBarTextInput');
  }

  public get correlationTabContent() {
    return this.page.testSubj.locator('timeline-tab-content-eql');
  }

  // ========================================
  // Data Providers
  // ========================================

  public get dataProvidersContainer() {
    return this.page.testSubj.locator('dataProviders');
  }

  public get toggleDataProviderButton() {
    return this.page.testSubj.locator('toggle-data-provider');
  }

  public get dataProviderField() {
    return this.page.testSubj.locator('field');
  }

  public get dataProviderOperator() {
    return this.page.testSubj.locator('operator');
  }

  public get dataProviderValue() {
    return this.page.testSubj.locator('value');
  }

  public get saveDataProviderButton() {
    return this.page.testSubj.locator('save');
  }

  public get addFieldButton() {
    return this.page.testSubj.locator('addField');
  }

  // ========================================
  // Timeline Actions
  // ========================================

  public get newTimelineButton() {
    return this.page.testSubj.locator('timeline-modal-new-timeline');
  }

  public get newTimelineDropdown() {
    return this.page.testSubj.locator('timeline-modal-new-timeline-dropdown-button');
  }

  public get bottomBarPlusButton() {
    return this.page.testSubj.locator('timeline-bottom-bar-open-button');
  }

  public get bottomBarCreateNewTimeline() {
    return this.page.testSubj.locator('timeline-bottom-bar-create-new-timeline');
  }

  public get bottomBarCreateNewTemplate() {
    return this.page.testSubj.locator('timeline-bottom-bar-create-new-timeline-template');
  }

  public get openTimelineButton() {
    return this.page.testSubj.locator('timeline-modal-open-timeline-button');
  }

  public get saveTimelineButton() {
    return this.page.testSubj.locator('timeline-modal-save-timeline');
  }

  public get saveTimelineTooltip() {
    return this.page.testSubj.locator('timeline-modal-save-timeline-tooltip');
  }

  public get starIcon() {
    return this.page.testSubj.locator('timeline-favorite-empty-star');
  }

  public get fullScreenButton() {
    return this.page.testSubj.locator('full-screen-active');
  }

  // ========================================
  // Save Timeline Modal
  // ========================================

  public get saveTimelineModal() {
    return this.page.testSubj.locator('save-timeline-modal');
  }

  public get timelineTitleInput() {
    return this.page.testSubj.locator('save-timeline-modal-title-input');
  }

  public get timelineDescriptionInput() {
    return this.page.testSubj.locator('save-timeline-modal-description-input');
  }

  public get saveTimelineModalSaveButton() {
    return this.page.testSubj.locator('save-timeline-modal-save-button');
  }

  public get saveAsNewSwitch() {
    return this.page.testSubj.locator('save-timeline-modal-save-as-new-switch');
  }

  // ========================================
  // Timeline Table
  // ========================================

  public get fieldBrowserButton() {
    return this.page.testSubj.locator('show-field-browser');
  }

  public get timelineProgressBar() {
    return this.page.testSubj.locator('progress-bar');
  }

  public get eventCount() {
    return this.page.testSubj.locator('query-events-count');
  }

  public get alertsCount() {
    return this.page.testSubj.locator('toolbar-alerts-count');
  }

  public get inspectButton() {
    return this.timelineFlyout.locator('[data-test-subj="inspect-empty-button"]');
  }

  public get pinEventButton() {
    return this.page.testSubj.locator('pin');
  }

  public get timelineEvent() {
    return this.page.testSubj.locator('event');
  }

  // ========================================
  // Filters
  // ========================================

  public get addFilterButton() {
    return this.page.testSubj
      .locator('timeline-search-or-filter')
      .locator('[data-test-subj="addFilter"]');
  }

  public get filterFieldInput() {
    return this.page.testSubj.locator('filterFieldSuggestionList');
  }

  public get filterOperatorInput() {
    return this.page.testSubj.locator('filterOperatorList');
  }

  public get filterValueInput() {
    return this.page.testSubj.locator('filterParamsComboBox phraseParamsComboxBox');
  }

  public get saveFilterButton() {
    return this.page.testSubj.locator('saveFilter');
  }

  // ========================================
  // Dynamic Locators
  // ========================================

  /**
   * Gets a timeline grid cell by field name
   * @param fieldName - The field name (e.g., 'host.name', 'user.name')
   */
  getTimelineGridCell(fieldName: string): Locator {
    return this.page.locator(
      `[data-test-subj="dataGridRowCell"][data-gridcell-column-id="${fieldName}"]`
    );
  }

  /**
   * Gets the cell value (without screenreader text)
   * @param fieldName - The field name
   */
  getTimelineGridCellValue(fieldName: string): Locator {
    return this.page.locator(
      `[data-test-subj="dataGridRowCell"][data-gridcell-column-id="${fieldName}"] .unifiedDataTable__cellValue`
    );
  }

  /**
   * Gets a timeline by its ID
   * @param timelineId - The timeline ID
   */
  getTimelineById(timelineId: string): Locator {
    return this.page.testSubj.locator(`timeline-title-${timelineId}`);
  }
}
