/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

interface AlertType {
  id: string;
  threshold: string;
}

export class MonitorDetailsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async navigateToOverviewPage(options?: Record<string, string>): Promise<void> {
    const queryString = options
      ? '?' +
        Object.entries(options)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&')
      : '';
    await this.page.goto(this.kbnUrl.get(`/app/uptime${queryString}`));
  }

  async waitForLoadingToFinish(): Promise<void> {
    await expect(this.page.testSubj.locator('kbnLoadingMessage')).toBeHidden();
  }

  async navigateToMonitorDetails(monitorId: string): Promise<void> {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
  }

  async selectFilterItem(filterType: string, itemArg: string | string[]): Promise<void> {
    const itemList = Array.isArray(itemArg) ? itemArg : [itemArg];
    await this.page.click(`[aria-label="expands filter group for ${filterType} filter"]`);
    for (const title of itemList) {
      await this.page.click(`li[title="${title}"]`);
    }
    await this.page.click(`[aria-label="Apply the selected filters for ${filterType}"]`);
  }

  async setStatusFilterUp(): Promise<void> {
    await this.page.testSubj.click('xpack.synthetics.filterBar.filterStatusUp');
  }

  async refreshFromES(): Promise<void> {
    await this.page.testSubj.click('superDatePickerApplyTimeButton');
  }

  async enableAnomalyDetection(): Promise<void> {
    await this.page.testSubj.click('uptimeEnableAnomalyBtn');
  }

  async getMonitorRedirects(): Promise<string | null> {
    return this.page.testSubj.locator('uptimeMonitorRedirectInfo').textContent();
  }

  async expandPingDetails(): Promise<void> {
    await this.page.testSubj.click('uptimePingListExpandBtn');
  }

  async ensureAnomalyDetectionFlyoutIsOpen(): Promise<void> {
    await this.page.testSubj.locator('uptimeMLFlyout').waitFor();
  }

  async isMLMenuVisible(): Promise<boolean> {
    return this.page.testSubj.locator('uptimeManageMLContextMenu').isVisible({ timeout: 3000 });
  }

  async canCreateJob(): Promise<boolean> {
    await this.ensureAnomalyDetectionFlyoutIsOpen();
    return this.page.testSubj.locator('uptimeMLCreateJobBtn').isEnabled();
  }

  async openAnomalyDetectionMenu(): Promise<void> {
    const visible = await this.isMLMenuVisible();
    if (!visible) {
      await this.page.testSubj.click('uptimeManageMLJobBtn');
    }
  }

  async closeAnomalyDetectionMenu(): Promise<void> {
    if (await this.isMLMenuVisible()) {
      await this.page.testSubj.click('uptimeManageMLJobBtn');
    }
  }

  async waitAndRefresh(timeout?: number): Promise<void> {
    await this.page.waitForTimeout(timeout ?? 1000);
    await this.refreshFromES();
    await this.waitForLoadingToFinish();
  }

  async updateAlert({ id, threshold }: AlertType): Promise<void> {
    await this.selectAlertThreshold(threshold);
    await this.page.testSubj.click('ruleFormStep-details');
    await this.page.testSubj.locator('ruleDetailsNameInput').fill(id);
  }

  async selectAlertThreshold(threshold: string): Promise<void> {
    await this.page.testSubj.click('ruleFormStep-definition');
    await this.page.testSubj.click('uptimeAnomalySeverity');
    await this.page.testSubj.click('anomalySeveritySelect');
    await this.page.click(`text=${threshold}`);
  }

  async disableAnomalyDetection(): Promise<void> {
    await this.openAnomalyDetectionMenu();
    await this.page.testSubj.locator('uptimeDeleteMLJobBtn').click({ timeout: 10000 });
    await this.page.testSubj.click('confirmModalConfirmButton');
    await this.page.locator('text=Job deleted').waitFor();
    await this.closeAnomalyDetectionMenu();
  }

  async disableAnomalyDetectionAlert(): Promise<void> {
    await this.openAnomalyDetectionMenu();
    await this.page.testSubj.locator('uptimeManageAnomalyAlertBtn').click({ timeout: 10000 });
    await this.page.testSubj.click('uptimeDisableAnomalyAlertBtn');
    await this.page.testSubj.click('confirmModalConfirmButton');
    await this.page.locator('text=Rule successfully disabled!').waitFor();
    await this.closeAnomalyDetectionMenu();
  }

  async assertText(text: string): Promise<void> {
    await expect(this.page.locator(`text=${text}`)).toBeVisible();
  }

  async waitForPingListItem(pingId: string): Promise<void> {
    await this.page.testSubj.locator(`"xpack.synthetics.pingList.ping-${pingId}"`).waitFor();
  }
}
