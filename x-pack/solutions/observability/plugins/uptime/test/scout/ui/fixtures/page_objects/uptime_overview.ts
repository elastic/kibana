/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, KibanaUrl } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class UptimeOverviewPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto(queryParams?: string): Promise<void> {
    const url = queryParams
      ? this.kbnUrl.get(`/app/uptime?${queryParams}`)
      : this.kbnUrl.get('/app/uptime');
    await this.page.goto(url);
  }

  async waitForLoadingToFinish(): Promise<void> {
    await expect(this.page.testSubj.locator('kbnLoadingMessage')).toBeHidden();
  }

  async clickSettingsLink(): Promise<void> {
    await this.page.testSubj.click('settings-page-link');
  }

  async getHeartbeatIndicesInput(): Promise<string> {
    return this.page.testSubj.locator('heartbeat-indices-input-loaded').inputValue();
  }

  async setHeartbeatIndices(value: string): Promise<void> {
    await this.page.testSubj.locator('heartbeat-indices-input-loaded').fill(value);
    await this.page.testSubj.click('apply-settings-button');
  }

  async clickOverviewPage(): Promise<void> {
    await this.page.testSubj.click('uptimeOverviewPage');
  }

  async clickMonitorLink(monitorId: string): Promise<void> {
    await this.page.testSubj.click(`monitor-page-link-${monitorId}`);
  }

  async clickExploreDataButton(): Promise<void> {
    await this.page.testSubj.click('uptimeExploreDataButton');
  }
}
