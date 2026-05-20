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
    await this.selectComboBoxOption(this.definitionSelector, name);
  }

  /** Selects an SLO instance by name in the configuration flyout. */
  async selectInstance(name: string) {
    await this.selectComboBoxOption(this.instanceSelector, name);
  }

  /** Switches the configuration flyout to "Grouped SLOs" mode. */
  async switchToGroupMode() {
    await this.overviewModeSelector.getByTestId('groups').click();
  }

  /** Clicks the confirm button to save the embeddable configuration. */
  async confirm() {
    await this.confirmButton.click();
  }

  /**
   * Type-and-pick interaction for an EuiComboBox scoped to a wrapper locator.
   * Uses keyboard navigation (ArrowDown + Enter) to pick the highlighted
   * option, mirroring how a keyboard user would interact with the combo box.
   * Tolerates duplicate names (which can appear when the suite-wide `sloData`
   * fixture seeds the same SLO across repeated local runs) without resorting
   * to index-based locators forbidden by `playwright/no-nth-methods`.
   */
  private async selectComboBoxOption(wrapper: Locator, name: string) {
    const input = wrapper.locator('input[role="combobox"]');
    await input.click();
    await input.fill(name);
    await this.page.keyboard.press('ArrowDown');
    await this.page.keyboard.press('Enter');
  }
}
