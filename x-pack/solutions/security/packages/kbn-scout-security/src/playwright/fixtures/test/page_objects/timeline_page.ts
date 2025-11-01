/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';
import { expect } from '@kbn/scout';
import { TIMEOUTS } from '../../../constants/timeouts';

/**
 * Page Object for the Timeline component in Kibana Security Solution
 *
 * Timeline is a powerful investigation tool that allows users to query and analyze
 * security events, create data providers, and save investigations.
 */
export class TimelinePage {
  constructor(private readonly page: ScoutPage) {}

  // ========================================
  // Locators - Main Elements
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
  // Locators - Query and Search
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
  // Locators - Tabs
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
  // Locators - Data Providers
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
  // Locators - Timeline Actions
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
  // Locators - Save Timeline Modal
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
  // Locators - Timeline Table
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
  // Locators - Filters
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

  // ========================================
  // Navigation & Opening/Closing
  // ========================================

  /**
   * Opens the timeline flyout from the bottom bar
   */
  async openTimeline() {
    // Click the bottom bar button if timeline is not already open
    const isVisible = await this.timelineFlyout.isVisible().catch(() => false);
    if (!isVisible) {
      await this.bottomBarPlusButton.click();
      await this.timelineFlyout.waitFor({
        state: 'visible',
        timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
      });
    }
  }

  /**
   * Closes the timeline flyout
   */
  async closeTimeline() {
    await this.closeFlyoutButton.click();
    await this.timelineFlyout.waitFor({ state: 'hidden', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
  }

  /**
   * Creates a new timeline
   */
  async createNewTimeline() {
    await this.openTimeline();
    await this.newTimelineButton.click();
    await this.waitForTimelineToLoad();
  }

  /**
   * Creates a new timeline template
   */
  async createNewTemplate() {
    await this.openTimeline();
    await this.bottomBarCreateNewTemplate.click();
    await this.waitForTimelineToLoad();
  }

  // ========================================
  // Tab Navigation
  // ========================================

  /**
   * Switches to the Query tab
   */
  async goToQueryTab() {
    await this.queryTabButton.click();
    await this.queryInput.waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_STANDARD });
  }

  /**
   * Switches to the Notes tab
   */
  async goToNotesTab() {
    await this.notesTabButton.click();
  }

  /**
   * Switches to the Correlation (EQL) tab
   */
  async goToCorrelationTab() {
    await this.correlationTabButton.click();
    await this.correlationTabContent.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Switches to the ES|QL tab
   */
  async goToEsqlTab() {
    await this.esqlTabButton.click();
  }

  // ========================================
  // Query Operations
  // ========================================

  /**
   * Gets the current query text from the timeline query input
   * @returns The query text
   */
  async getQueryText(): Promise<string> {
    return (await this.queryInput.textContent()) || '';
  }

  /**
   * Sets the query text in the timeline
   * @param query - The query to set
   */
  async setQueryText(query: string) {
    await this.queryInput.clear();
    await this.queryInput.fill(query);
    await this.waitForTimelineToLoad();
  }

  /**
   * Clears the current query
   */
  async clearQuery() {
    await this.queryInput.clear();
    await this.waitForTimelineToLoad();
  }

  /**
   * Switches the query language to KQL
   */
  async switchToKQL() {
    await this.showQueryBarMenuButton.click();
    await this.switchQueryLanguageButton.click();
    await this.kqlLanguageButton.click();
  }

  /**
   * Switches the query language to Lucene
   */
  async switchToLucene() {
    await this.showQueryBarMenuButton.click();
    await this.switchQueryLanguageButton.click();
    await this.luceneLanguageButton.click();
  }

  // ========================================
  // Save & Manage Timeline
  // ========================================

  /**
   * Saves the timeline with a title and optional description
   * @param title - The timeline title
   * @param description - Optional description
   */
  async saveTimeline(title: string, description?: string) {
    await this.saveTimelineButton.click();
    await this.saveTimelineModal.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.timelineTitleInput.clear();
    await this.timelineTitleInput.fill(title);

    if (description) {
      await this.timelineDescriptionInput.clear();
      await this.timelineDescriptionInput.fill(description);
    }

    await this.saveTimelineModalSaveButton.click();
    await this.saveTimelineModal.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Saves the timeline as a new copy
   * @param title - The new timeline title
   * @param description - Optional description
   */
  async saveTimelineAsNew(title: string, description?: string) {
    await this.saveTimelineButton.click();
    await this.saveTimelineModal.waitFor({
      state: 'visible',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });

    await this.saveAsNewSwitch.click();

    await this.timelineTitleInput.clear();
    await this.timelineTitleInput.fill(title);

    if (description) {
      await this.timelineDescriptionInput.clear();
      await this.timelineDescriptionInput.fill(description);
    }

    await this.saveTimelineModalSaveButton.click();
    await this.saveTimelineModal.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_STANDARD,
    });
  }

  /**
   * Marks the timeline as favorite by clicking the star icon
   */
  async markAsFavorite() {
    await this.starIcon.click();
  }

  // ========================================
  // Data Providers
  // ========================================

  /**
   * Toggles the data providers section visibility
   */
  async toggleDataProviders() {
    await this.toggleDataProviderButton.click();
  }

  /**
   * Adds a data provider to the timeline
   * @param field - The field name
   * @param operator - The operator (e.g., 'is', 'is not')
   * @param value - The value
   */
  async addDataProvider(field: string, operator: string, value: string) {
    await this.toggleDataProviders();

    await this.addFieldButton.click();
    await this.dataProviderField.fill(field);
    await this.dataProviderOperator.selectOption({ label: operator });
    await this.dataProviderValue.fill(value);
    await this.saveDataProviderButton.click();
  }

  // ========================================
  // Filters
  // ========================================

  /**
   * Adds a filter to the timeline
   * @param field - The field name
   * @param operator - The operator
   * @param value - The value
   */
  async addFilter(field: string, operator: string, value: string) {
    await this.addFilterButton.click();
    await this.filterFieldInput.fill(field);
    await this.filterOperatorInput.selectOption({ label: operator });
    await this.filterValueInput.fill(value);
    await this.saveFilterButton.click();
    await this.waitForTimelineToLoad();
  }

  // ========================================
  // Field Browser
  // ========================================

  /**
   * Opens the field browser
   */
  async openFieldBrowser() {
    await this.fieldBrowserButton.click();
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Waits for the timeline to finish loading
   */
  async waitForTimelineToLoad() {
    // Wait for progress bar to appear
    await this.timelineProgressBar
      .waitFor({ state: 'visible', timeout: TIMEOUTS.UI_ELEMENT_SHORT })
      .catch(() => {
        // Progress bar might not appear if load is very fast
      });

    // Wait for progress bar to disappear
    await this.timelineProgressBar.waitFor({
      state: 'hidden',
      timeout: TIMEOUTS.UI_ELEMENT_EXTRA_LONG,
    });
  }

  /**
   * Gets the event count from the timeline
   * @returns The number of events
   */
  async getEventCount(): Promise<number> {
    const text = await this.eventCount.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // ========================================
  // Assertion Methods
  // ========================================

  /**
   * Asserts that the timeline query contains the expected text
   * @param expectedQuery - The expected query text
   */
  async expectQueryText(expectedQuery: string) {
    await expect(this.queryInput).toHaveText(expectedQuery);
  }

  /**
   * Asserts that the timeline query contains text
   * @param text - The text to check for
   */
  async expectQueryContains(text: string) {
    await expect(this.queryInput).toContainText(text);
  }

  /**
   * Asserts that the timeline is open
   */
  async expectTimelineOpen() {
    await expect(this.timelineFlyout).toBeVisible();
  }

  /**
   * Asserts that the timeline is closed
   */
  async expectTimelineClosed() {
    await expect(this.timelineFlyout).toBeHidden();
  }

  /**
   * Asserts the timeline title
   * @param expectedTitle - The expected title
   */
  async expectTimelineTitle(expectedTitle: string) {
    await expect(this.timelineTitle).toHaveText(expectedTitle);
  }

  /**
   * Asserts the event count
   * @param expectedCount - The expected number of events
   */
  async expectEventCount(expectedCount: number) {
    await expect(this.eventCount).toContainText(`${expectedCount}`);
  }
}
