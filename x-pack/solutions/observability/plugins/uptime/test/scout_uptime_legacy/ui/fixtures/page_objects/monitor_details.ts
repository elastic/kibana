/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

interface AlertType {
  id: string;
  threshold: string;
}

export class MonitorDetailsPage {
  constructor(private readonly page: ScoutPage) {}

  async navigateToOverviewPage(params?: Record<string, string>): Promise<void> {
    await this.page.gotoApp('uptime', params ? { params } : undefined);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.waitForSelector('uptimeMonitorPage', { state: 'visible' });
  }

  async navigateToMonitorDetails(monitorId: string): Promise<void> {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
  }

  async selectFilterItem(filterType: string, itemArg: string | string[]): Promise<void> {
    const itemList = Array.isArray(itemArg) ? itemArg : [itemArg];
    await this.page.testSubj.click(`o11yFilterGroupButton-${filterType}`);
    for (const title of itemList) {
      await this.page.click(`li[title="${title}"]`);
    }
    await this.page.testSubj.click('o11yFieldValueSelectionApplyButton');
  }

  async setStatusFilterUp(): Promise<void> {
    await this.page.testSubj.click('xpack.synthetics.filterBar.filterStatusUp');
  }

  getMonitorRedirects() {
    return this.page.testSubj.locator('uptimeMonitorRedirectInfo');
  }

  async expandPingDetails(): Promise<void> {
    await this.page.testSubj.click('uptimePingListExpandBtn');
  }

  async enableAnomalyDetection(): Promise<void> {
    await this.page.testSubj.locator('uptimeEnableAnomalyBtn').click();
  }

  async createMLJob(): Promise<void> {
    await this.page.testSubj.locator('uptimeMLCreateJobBtn').click();
    await this.page.testSubj.locator('toastCloseButton').click({ timeout: 20_000 });
    await this.page.testSubj.locator('ruleDefinition').waitFor({ timeout: 20_000 });
  }

  async updateAlert({ id, threshold }: AlertType): Promise<void> {
    await this.selectAlertThreshold(threshold);
    await this.page.testSubj.click('ruleFormStep-details');
    await this.page.testSubj.locator('ruleDetailsNameInput').clear();
    await this.page.testSubj.locator('ruleDetailsNameInput').fill(id);
  }

  async selectAlertThreshold(threshold: string): Promise<void> {
    await this.page.testSubj.click('ruleFormStep-definition');
    await this.page.testSubj.click('uptimeAnomalySeverity');
    await this.page.testSubj.click('anomalySeveritySelect');
    await this.page.click(`text=${threshold}`);
  }

  async saveRule(): Promise<void> {
    await this.page.testSubj.click('ruleFlyoutFooterSaveButton');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  getPingListRows() {
    return this.page.testSubj.locator('uptimePingListTable').locator('tbody tr');
  }

  getDurationChart() {
    return this.page.testSubj.locator('uptimeWithResponsiveWrapper--panel').locator('.echChart');
  }

  getOverallAvailability() {
    return this.page.testSubj.locator('uptimeOverallAvailability');
  }

  async hoverStepDurationButton(): Promise<void> {
    // eslint-disable-next-line playwright/no-nth-methods
    await this.page.testSubj.locator('syntheticsStepDurationButton').first().hover();
  }
}
