/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';

export class UptimeOverviewPage {
  constructor(private readonly page: ScoutPage) {}

  async goto(params?: Record<string, string>): Promise<void> {
    await this.page.gotoApp('uptime', params ? { params } : undefined);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await this.page.testSubj.waitForSelector('uptimeOverviewPage', { state: 'visible' });
  }

  async clickSettingsLink(): Promise<void> {
    await this.page.testSubj.click('settings-page-link');
  }

  getHeartbeatIndicesInput() {
    return this.page.testSubj.locator('heartbeat-indices-input-loaded');
  }

  async setHeartbeatIndices(value: string): Promise<void> {
    await this.page.testSubj.locator('heartbeat-indices-input-loaded').fill(value);
    await this.page.testSubj.click('apply-settings-button');
  }

  async clickOverviewPage(): Promise<void> {
    await this.page.testSubj.click('uptimeOverviewPage');
  }

  async waitForMonitorTable(): Promise<void> {
    await this.page.testSubj.waitForSelector('uptimeOverviewPage', { state: 'visible' });
    await this.page.testSubj.waitForSelector('monitor-page-link-0001-up', {
      state: 'visible',
      timeout: 30_000,
    });
  }

  async clickMonitorLink(monitorId: string): Promise<void> {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
  }

  async clickExploreDataButton(): Promise<void> {
    await this.page.testSubj.click('uptimeExploreDataButton');
  }

  getPingListTable() {
    return this.page.testSubj.locator('uptimePingListTable');
  }

  async clickMonitorByName(name: string): Promise<void> {
    await this.page.getByText(name).click();
  }

  getJourneyStepRows() {
    return this.page.locator('table .euiTableRow-isClickable');
  }
}
