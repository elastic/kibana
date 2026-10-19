/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../constants';

/**
 * Machine-learning anomaly-detection flyout, reachable from the inventory and hosts-view
 * headers. Encapsulates the "create jobs" cards, the anomalies tab (job-type combo box,
 * absolute start-date picker, result rows) and the per-row action menu — replacing the FTR
 * `infraHome` anomaly helpers.
 */
export class AnomalyFlyoutPage {
  public readonly openButton: Locator;
  public readonly flyout: Locator;
  public readonly hostsJobCard: Locator;
  public readonly k8sJobCard: Locator;
  public readonly anomaliesTab: Locator;
  public readonly jobTypeComboBox: Locator;
  public readonly hostsComboBoxItem: Locator;
  public readonly k8sComboBoxItem: Locator;
  public readonly noAnomaliesMessage: Locator;
  public readonly anomalyRows: Locator;
  public readonly nodeNameRows: Locator;
  public readonly closeButton: Locator;
  public readonly actionMenuButton: Locator;
  public readonly showAffectedHostsButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.openButton = this.page.getByTestId('openAnomalyFlyoutButton');
    this.flyout = this.page.getByTestId('loadMLFlyout');
    this.hostsJobCard = this.flyout.getByTestId('infraHostsJobCard');
    this.k8sJobCard = this.flyout.getByTestId('infraK8sJobCard');
    this.anomaliesTab = this.flyout.getByTestId('anomalyFlyoutAnomaliesTab');
    this.jobTypeComboBox = this.flyout.getByTestId('anomaliesComboBoxType');
    // Combo-box options and date-picker popovers render in a portal outside the flyout DOM,
    // so they are scoped to the page rather than the flyout.
    this.hostsComboBoxItem = this.page.getByTestId('anomaliesHostComboBoxItem');
    this.k8sComboBoxItem = this.page.getByTestId('anomaliesK8sComboBoxItem');
    this.noAnomaliesMessage = this.flyout.getByTestId('noAnomaliesFoundMsg');
    this.anomalyRows = this.flyout.getByTestId('anomalyRow');
    this.nodeNameRows = this.flyout.getByTestId('nodeNameRow');
    this.closeButton = this.flyout.getByTestId('euiFlyoutCloseButton');
    this.actionMenuButton = this.flyout.getByTestId('infraAnomalyActionMenuButton');
    this.showAffectedHostsButton = this.page.getByTestId('infraAnomalyFlyoutShowAffectedHosts');
  }

  async open() {
    // The header link only mounts once the ML topbar capabilities and the metrics data view
    // have resolved, so wait for it before clicking.
    await this.openButton.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await this.openButton.click();
    await this.flyout.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async close() {
    await this.closeButton.click();
    await this.flyout.waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }

  async goToAnomaliesTab() {
    await this.anomaliesTab.click();
  }

  async selectHostsJobType() {
    await this.jobTypeComboBox.click();
    await this.hostsComboBoxItem.click();
  }

  async selectK8sJobType() {
    await this.jobTypeComboBox.click();
    await this.k8sComboBoxItem.click();
  }

  /**
   * Sets the absolute start date of the anomalies-table `EuiSuperDatePicker`, leaving the end
   * bound at its default (`now`). The picker auto-applies (no update button), which triggers a
   * refetch of the anomaly results.
   */
  async setStartDate(date: string) {
    const showDatesButton = this.flyout.getByTestId('superDatePickerShowDatesButton');
    if (await showDatesButton.isVisible().catch(() => false)) {
      await showDatesButton.click();
    }

    const absoluteTab = this.page.getByTestId('superDatePickerAbsoluteTab');
    if (!(await absoluteTab.isVisible().catch(() => false))) {
      await this.flyout.getByTestId('superDatePickerstartDatePopoverButton').click();
    }
    await absoluteTab.click();

    const absoluteInput = this.page.getByTestId('superDatePickerAbsoluteDateInput');
    await absoluteInput.fill(date);
    await absoluteInput.press('Enter');
  }

  async expectAnomalyCount(count: number) {
    await expect(this.anomalyRows).toHaveCount(count, { timeout: EXTENDED_TIMEOUT });
  }

  async getFirstNodeName() {
    await expect(this.nodeNameRows).not.toHaveCount(0, { timeout: EXTENDED_TIMEOUT });
    const [firstNodeName] = await this.nodeNameRows.all();
    // The influencers cell joins host names with a comma, but EUI injects word-break characters
    // (zero-width spaces / line breaks) between values for wrapping. Keep only the characters that
    // make up the comma-separated host list so it matches the rison-encoded `host.name` values in
    // the "show affected hosts" URL.
    return (await firstNodeName.innerText()).replace(/[^a-zA-Z0-9._,-]/g, '');
  }

  async clickShowAffectedHosts() {
    await expect(this.actionMenuButton).not.toHaveCount(0, { timeout: EXTENDED_TIMEOUT });
    const [firstActionMenu] = await this.actionMenuButton.all();
    await firstActionMenu.click();
    await this.showAffectedHostsButton.click();
  }
}
