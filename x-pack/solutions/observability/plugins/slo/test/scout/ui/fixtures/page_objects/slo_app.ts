/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AppMenu,
  ObservabilityNavigation,
  type Locator,
  type ScoutPage,
  type ScoutTestConfig,
} from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class SLOApp {
  private readonly appMenu: AppMenu;
  private readonly nav: ObservabilityNavigation;
  readonly settingsPage: Locator;
  readonly globalSettingsTab: Locator;
  readonly globalSettingsForm: Locator;
  readonly sliRetentionSwitch: Locator;
  readonly sliRetentionPeriod: Locator;
  readonly globalSettingsSaveButton: Locator;
  readonly sliRetentionConfirmModal: Locator;

  constructor(private readonly page: ScoutPage, private readonly config: ScoutTestConfig) {
    this.appMenu = new AppMenu(page);
    this.nav = new ObservabilityNavigation(page);
    this.settingsPage = page.testSubj.locator('slosSettingsPage');
    this.globalSettingsTab = page.testSubj.locator('sloSettingsTabGlobal');
    this.globalSettingsForm = page.testSubj.locator('sloGlobalSettingsForm');
    this.sliRetentionSwitch = page.testSubj.locator('sloGlobalSettingsRetentionSwitch');
    this.sliRetentionPeriod = page.testSubj.locator('sloGlobalSettingsRetentionPeriod');
    this.globalSettingsSaveButton = page.testSubj.locator('sloGlobalSettingsSaveButton');
    this.sliRetentionConfirmModal = page.testSubj.locator('sloSliRetentionConfirmModal');
  }

  /** Navigate to SLO app (main list). Waits for the Manage SLOs header item. */
  async goto() {
    await this.page.gotoApp('slo');
    await this.appMenu.revealItem('sloHeaderManageLink');
  }

  /** Navigate to SLO Management page (Actions > Health scan). Clicks Manage SLOs from the list view. */
  async gotoManagement() {
    await this.page.gotoApp('slo');
    await this.appMenu.clickItem('sloHeaderManageLink');
    await expect(this.page.getByTestId('headerControlActionsButton')).toBeVisible({
      timeout: 15000,
    });
  }

  /** Navigate to the SLO settings page (Space tab). */
  async gotoSettings() {
    await this.page.gotoApp('slo/settings', { readyWhen: this.settingsPage });
  }

  /** Opens the Global tab of the SLO settings page and waits for its form. */
  async openGlobalSettingsTab() {
    await this.globalSettingsTab.click();
    await this.globalSettingsForm.waitFor({ state: 'visible' });
  }

  /** Turns SLI retention on, sets its period, and clicks Apply. */
  async enableSliRetention(periodDays: number) {
    await this.sliRetentionSwitch.click();
    await this.sliRetentionPeriod.fill(String(periodDays));
    await this.globalSettingsSaveButton.click();
  }

  /** Confirms the SLI retention modal. */
  async confirmSliRetention() {
    await this.sliRetentionConfirmModal.waitFor({ state: 'visible' });
    await this.sliRetentionConfirmModal.getByTestId('confirmModalConfirmButton').click();
  }

  async openFromSideMenu() {
    if (this.config.serverless || this.config.isCloud) {
      // New chrome nav: the shared helper resolves whether SLOs render in the
      // primary nav or the "More" overflow menu.
      await this.nav.clickBodyNavItemByDeepLinkId('slo');
    } else {
      await this.page.getByTestId('observability-nav-slo-slos').click();
    }
  }

  /** Opens the Actions popover and clicks Health scan, which opens the health scan flyout */
  async openHealthScanFlyout() {
    await expect(this.page.getByTestId('headerControlActionsButton')).toBeVisible({
      timeout: 15000,
    });
    await this.page.getByTestId('headerControlActionsButton').click();
    await this.page.getByTestId('healthScanItem').click();
    await expect(this.page.getByTestId('healthScanFlyout')).toBeVisible();
  }

  /** Clicks Run Scan to schedule a new health scan (force: true) */
  async runHealthScan() {
    await this.page.getByTestId('healthScanRunButton').click();
  }

  /** Waits for a scan to appear and clicks View results for the first one with the given scanId */
  async openScanResults(scanId: string) {
    await this.page.getByTestId(`healthScanViewResults-${scanId}`).click();
  }

  /** Clicks the Next page button in the results panel */
  async clickNextPage() {
    await this.page.getByTestId('healthScanResultsNextPage').click();
  }

  /** Clicks the Previous page button in the results panel */
  async clickPreviousPage() {
    await this.page.getByTestId('healthScanResultsPreviousPage').click();
  }

  /** Returns the Next button locator (for checking disabled state) */
  getNextPageButton() {
    return this.page.getByTestId('healthScanResultsNextPage');
  }

  /** Returns the Previous button locator (for checking disabled state) */
  getPreviousPageButton() {
    return this.page.getByTestId('healthScanResultsPreviousPage');
  }

  /** Waits for the scan results table to be visible and populated */
  async waitForScanResults() {
    await expect(this.page.getByTestId('healthScanResultsTable')).toBeVisible();
  }
}
