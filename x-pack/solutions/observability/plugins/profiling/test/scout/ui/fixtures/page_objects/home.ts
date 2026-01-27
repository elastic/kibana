/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '..';

export class ProfilingHomePage {
  constructor(public readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('profiling')}`);
    await this.waitForThreadsTab();
  }

  async gotoWithTimeRange(rangeFrom: string, rangeTo: string) {
    await this.page.goto(
      `${this.kbnUrl.app('profiling')}?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`
    );
    await this.waitForThreadsTab();
  }

  /*
   * Waits for the Threads tab to be visible
   */
  private async waitForThreadsTab() {
    await this.page.getByRole('tab', { name: 'Threads' }).waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  // Tab navigation methods
  async getTabList() {
    return this.page.getByRole('tablist');
  }

  async clickTab(tabName: string) {
    await this.page.getByRole('tablist').getByRole('tab', { name: tabName }).click();
  }

  async getTab(tabName: string) {
    return this.page.getByRole('tablist').getByRole('tab', { name: tabName });
  }

  // Content verification methods
  async expectTopNContent() {
    await this.page.getByText('Top 46').waitFor({ state: 'visible' });
  }

  async expectUserPrivilegeLimitation() {
    await this.page.getByText('User privilege limitation').waitFor({ state: 'visible' });
  }

  // URL verification methods
  async expectUrlToInclude(path: string) {
    await this.page.waitForURL(`**${path}**`);
  }

  // Setup status methods
  async getSetupStatus() {
    return this.page.testSubj.locator('profilingSetupStatus');
  }

  async isSetupComplete() {
    const status = await this.getSetupStatus();
    return (await status.getAttribute('data-status')) === 'complete';
  }

  // Error state methods
  async getErrorState() {
    return this.page.testSubj.locator('profilingErrorState');
  }

  async getUnauthorizedMessage() {
    return this.page.getByText('User privilege limitation');
  }
}
