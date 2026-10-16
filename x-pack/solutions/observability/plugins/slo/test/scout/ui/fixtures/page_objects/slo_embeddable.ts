/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Locator, ScoutPage } from '@kbn/scout-oblt';

const SLO_OVERVIEW_PANEL_TYPE = 'SLO Overview';

export class SLOEmbeddable {
  readonly singleConfigurationFlyout: Locator;
  readonly groupConfigurationFlyout: Locator;
  readonly overviewModeSelector: Locator;
  readonly definitionSelector: Locator;
  readonly instanceSelector: Locator;
  readonly confirmButton: Locator;
  readonly singleOverviewPanel: Locator;
  readonly groupOverviewPanel: Locator;
  readonly groupByField: Locator;
  readonly groupField: Locator;
  readonly kqlBar: Locator;

  constructor(private readonly page: ScoutPage) {
    this.singleConfigurationFlyout = page.testSubj.locator('sloSingleOverviewConfiguration');
    this.groupConfigurationFlyout = page.testSubj.locator('sloGroupOverviewConfiguration');
    this.overviewModeSelector = page.testSubj.locator('sloOverviewModeSelector');
    this.definitionSelector = page.testSubj.locator('sloDefinitionSelector');
    this.instanceSelector = page.testSubj.locator('sloInstanceSelector');
    this.confirmButton = page.testSubj.locator('sloConfirmButton');
    this.singleOverviewPanel = page.testSubj.locator('sloSingleOverviewPanel');
    this.groupOverviewPanel = page.testSubj.locator('sloGroupOverviewPanel');
    this.groupByField = page.testSubj.locator('sloGroupOverviewConfigurationGroupBy');
    this.groupField = page.testSubj.locator('sloGroupOverviewConfigurationGroup');
    this.kqlBar = page.testSubj.locator('sloGroupOverviewConfigurationKqlBar');
  }

  /**
   * Searches for the SLO Overview panel in the dashboard "Add panel" flyout
   * and clicks its UI-action entry. The flyout must already be open
   * (e.g. via `pageObjects.dashboard.openAddPanelFlyout()`).
   */
  async addOverviewPanelFromFlyout() {
    await this.page.testSubj
      .locator('dashboardPanelSelectionFlyout__searchInput')
      .fill(SLO_OVERVIEW_PANEL_TYPE);
    await this.page.testSubj.locator(`create-action-${SLO_OVERVIEW_PANEL_TYPE}`).click();
  }

  /** Selects an SLO definition by name in the configuration flyout. */
  async selectDefinition(name: string) {
    // Definitions are fetched server-side via onSearchChange; type to surface the match.
    await this.page.components.comboBox('sloDefinitionSelector').setSelectedOptions([name]);
  }

  /** Selects an SLO instance by name in the configuration flyout. */
  async selectInstance(name: string) {
    // Instances are fetched server-side via async/onSearchChange; type to surface the match.
    await this.page.components.comboBox('sloInstanceSelector').setSelectedOptions([name]);
  }

  /** Switches the configuration flyout to "Grouped SLOs" mode. */
  async switchToGroupMode() {
    await this.overviewModeSelector.getByTestId('groups').click();
  }

  /** Clicks the confirm button to save the embeddable configuration. */
  async confirm() {
    await this.confirmButton.click();
  }
}
