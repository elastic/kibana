/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl, Locator } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class UptimeAppPage {
  public readonly overviewPage: Locator;
  public readonly settingsPage: Locator;
  public readonly monitorPage: Locator;
  public readonly certificatesPage: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.overviewPage = page.testSubj.locator('uptimeOverviewPage');
    this.settingsPage = page.testSubj.locator('uptimeSettingsPage');
    this.monitorPage = page.testSubj.locator('uptimeMonitorPage');
    this.certificatesPage = page.testSubj.locator('uptimeCertificatesPage');
  }

  async waitForLoadingToFinish() {
    await expect(this.page.testSubj.locator('kbnLoadingMessage')).toBeHidden({ timeout: 60_000 });
  }

  async waitForDataLoaded() {
    await this.waitForLoadingToFinish();
    await expect(this.page.testSubj.locator('data-missing')).toBeHidden({ timeout: 60_000 });
  }

  // Navigation

  async navigateToOverview(search?: string) {
    const url = search ? `/app/uptime?${search}` : '/app/uptime';
    await this.page.goto(this.kbnUrl.get(url));
    await this.waitForLoadingToFinish();
  }

  async navigateToSettings() {
    await this.page.testSubj.waitForSelector('settings-page-link', { timeout: 10_000 });
    await this.page.testSubj.click('settings-page-link');
    await this.page.testSubj.waitForSelector('uptimeSettingsPage', { timeout: 10_000 });
  }

  async navigateToCertificates() {
    await this.page.locator('[href="/app/uptime/certificates"]').click();
    await this.page.testSubj.waitForSelector('uptimeCertificatesPage');
  }

  async navigateToMonitor(monitorId: string) {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
    await this.page.testSubj.waitForSelector('uptimeMonitorPage', { timeout: 30_000 });
  }

  async refreshApp() {
    await this.page.reload();
    await this.waitForLoadingToFinish();
  }

  // Overview page helpers

  async getMonitorIds(): Promise<string[]> {
    const links = this.page.locator('[data-test-subj^="monitor-page-link-"]');
    const subjs = await links.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-test-subj'))
    );
    return subjs
      .filter((subj): subj is string => Boolean(subj))
      .map((subj) => subj.replace('monitor-page-link-', ''));
  }

  async waitForMonitorIds(expectedIds: string[]) {
    for (const id of expectedIds) {
      await this.page.testSubj.waitForSelector(`monitor-page-link-${id}`, { timeout: 15_000 });
    }
  }

  async getSnapshotCount(): Promise<{ up: string; down: string }> {
    const up =
      (await this.page.testSubj.locator('xpack.synthetics.snapshot.donutChart.up').textContent()) ??
      '0';
    const down =
      (await this.page.testSubj
        .locator('xpack.synthetics.snapshot.donutChart.down')
        .textContent()) ?? '0';
    return { up: up.trim(), down: down.trim() };
  }

  async setStatusFilterUp() {
    await this.page.testSubj.click('xpack.synthetics.filterBar.filterStatusUp');
  }

  async setStatusFilterDown() {
    await this.page.testSubj.click('xpack.synthetics.filterBar.filterStatusDown');
  }

  async resetStatusFilter() {
    const upFilter = this.page.testSubj.locator('xpack.synthetics.filterBar.filterStatusUp');
    if (
      await upFilter.evaluate((el: Element) =>
        el.classList.contains('euiFilterButton-hasActiveFilters')
      )
    ) {
      await this.setStatusFilterUp();
    }
    const downFilter = this.page.testSubj.locator('xpack.synthetics.filterBar.filterStatusDown');
    if (
      await downFilter.evaluate((el: Element) =>
        el.classList.contains('euiFilterButton-hasActiveFilters')
      )
    ) {
      await this.setStatusFilterDown();
    }
  }

  async selectFilterItem(filterType: string, items: string[]) {
    const filterPopoverButton = this.page.locator(
      `[aria-label="expands filter group for ${filterType} filter"]`
    );
    await filterPopoverButton.click();
    for (const title of items) {
      await this.page.locator(`li[title="${title}"]`).click();
    }
    await this.page.locator(`[aria-label="Apply the selected filters for ${filterType}"]`).click();
  }

  async inputFilterQuery(query: string) {
    const input = this.page.testSubj.locator('queryInput');
    await input.click();
    await input.fill(query);
    await this.page.keyboard.press('Enter');
  }

  async resetFilters() {
    await this.inputFilterQuery('');
    await this.resetStatusFilter();
  }

  async goToNextPage() {
    await this.page.testSubj.click('xpack.uptime.monitorList.nextButton');
  }

  async openPageSizeSelectPopover() {
    await this.page.testSubj.click('xpack.uptime.monitorList.pageSizeSelect.popoverOpen');
  }

  async setMonitorListPageSize(size: number) {
    await this.openPageSizeSelectPopover();
    await this.page.testSubj.click(`xpack.uptime.monitorList.pageSizeSelect.sizeSelectItem${size}`);
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  // Settings page helpers

  async loadSettingsFields() {
    await this.page.testSubj.waitForSelector('heartbeat-indices-input-loaded', { timeout: 10_000 });
    const heartbeatIndices = await this.page.testSubj
      .locator('heartbeat-indices-input-loaded')
      .inputValue();
    const expiration = await this.page.testSubj
      .locator('expiration-threshold-input-loaded')
      .inputValue();
    const age = await this.page.testSubj.locator('age-threshold-input-loaded').inputValue();
    return {
      heartbeatIndices,
      certAgeThreshold: parseInt(age, 10),
      certExpirationThreshold: parseInt(expiration, 10),
      defaultConnectors: [] as string[],
      defaultEmail: { to: [] as string[], cc: [] as string[], bcc: [] as string[] },
    };
  }

  async changeHeartbeatIndicesInput(text: string) {
    const input = this.page.testSubj.locator('heartbeat-indices-input-loaded');
    await input.clear();
    await input.fill(text);
  }

  async changeErrorThresholdInput(text: string) {
    const input = this.page.testSubj.locator('expiration-threshold-input-loaded');
    await input.clear();
    await input.fill(text);
  }

  async changeWarningThresholdInput(text: string) {
    const input = this.page.testSubj.locator('age-threshold-input-loaded');
    await input.clear();
    await input.fill(text);
  }

  async isApplyButtonDisabled(): Promise<boolean> {
    return this.page.testSubj.locator('apply-settings-button').isDisabled();
  }

  async applySettings() {
    await this.page.testSubj.click('apply-settings-button');
    await expect(async () => {
      const disabled = await this.page.testSubj
        .locator('heartbeat-indices-input-loaded')
        .getAttribute('disabled');
      expect(disabled).toBeNull();
    }).toPass({ timeout: 10_000 });
  }

  // Certificates page helpers

  async hasViewCertButton(): Promise<boolean> {
    try {
      await this.page
        .locator('[href="/app/uptime/certificates"]')
        .waitFor({ state: 'visible', timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }

  async getCertificateTotal(): Promise<string> {
    return (await this.page.testSubj.locator('uptimeCertTotal').textContent()) ?? '0';
  }

  async certificateExists(certId: string, monitorId: string) {
    await this.page.testSubj.waitForSelector(certId, { timeout: 60_000 });
    await this.page.testSubj.waitForSelector(`monitor-page-link-${monitorId}`, { timeout: 5_000 });
  }

  async getCertificatesTableText(): Promise<string> {
    return (await this.page.testSubj.locator('uptimeCertificatesTable').textContent()) ?? '';
  }

  async searchCertificates(text: string) {
    const input = this.page.testSubj.locator('uptimeCertSearch');
    await input.clear();
    await input.fill(text);
    // cert search uses 350ms debounce before firing
    await this.page.waitForTimeout(500);
    await this.waitForLoadingToFinish();
  }

  // ML anomaly helpers

  async openMLFlyout() {
    await this.page.testSubj.click('uptimeEnableAnomalyBtn');
    await this.page.testSubj.waitForSelector('uptimeMLFlyout', { timeout: 15_000 });
  }

  async hasMLJob(): Promise<boolean> {
    try {
      await this.page.testSubj
        .locator('uptimeManageMLJobBtn')
        .waitFor({ state: 'visible', timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  async isCreateMLJobButtonDisabled(): Promise<boolean> {
    return !!(await this.page.testSubj.locator('uptimeMLCreateJobBtn').getAttribute('disabled'));
  }

  async isMLLicenseInfoMissing(): Promise<boolean> {
    return this.page.testSubj.locator('uptimeMLLicenseInfo').isHidden({ timeout: 1_000 });
  }

  async createMLJob() {
    await this.page.testSubj.click('uptimeMLCreateJobBtn');
    await this.page.testSubj.waitForSelector('uptimeMLJobSuccessfullyCreated', { timeout: 30_000 });
  }

  async openMLManageMenu() {
    await this.cancelAlertFlyout();
    await expect(async () => {
      const isVisible = await this.page.testSubj.locator('uptimeManageMLJobBtn').isVisible();
      if (!isVisible) {
        await this.page.reload();
        await this.waitForLoadingToFinish();
      }
      await this.page.testSubj.locator('uptimeManageMLJobBtn').click({ timeout: 10_000 });
      await this.page.testSubj
        .locator('uptimeManageMLContextMenu')
        .waitFor({ state: 'visible', timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
  }

  async deleteMLJob() {
    await this.page.testSubj.waitForSelector('uptimeDeleteMLJobBtn', { timeout: 10_000 });
    await this.page.testSubj.click('uptimeDeleteMLJobBtn');
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    await this.page.testSubj.waitForSelector('uptimeMLJobSuccessfullyDeleted', { timeout: 10_000 });
  }

  private async cancelAlertFlyout() {
    try {
      const closeBtn = this.page.testSubj.locator('euiFlyoutCloseButton');
      await closeBtn.waitFor({ state: 'visible', timeout: 5_000 });
      await closeBtn.click();
    } catch {
      // flyout not visible
    }
    try {
      const confirmBtn = this.page.testSubj.locator('ruleFlyoutConfirmCancelConfirmButton');
      await confirmBtn.waitFor({ state: 'visible', timeout: 3_000 });
      await confirmBtn.click();
    } catch {
      // confirm dialog not visible
    }
  }

  async hasMissingData(): Promise<boolean> {
    try {
      await this.page.testSubj
        .locator('data-missing')
        .waitFor({ state: 'visible', timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }

  // Missing mappings

  async hasMappingsError(): Promise<boolean> {
    try {
      await this.page.testSubj
        .locator('xpack.synthetics.mappingsErrorPage')
        .waitFor({ state: 'visible', timeout: 15_000 });
      return true;
    } catch {
      return false;
    }
  }
}
