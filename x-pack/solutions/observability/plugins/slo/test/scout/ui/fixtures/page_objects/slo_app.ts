/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ScoutPage, ScoutTestConfig } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

export class SLOApp {
  constructor(private readonly page: ScoutPage, private readonly config: ScoutTestConfig) {}

  /** Navigate to SLO app (main list). Waits for "Manage SLOs" header link. */
  async goto() {
    await this.page.gotoApp('slo');
    await expect(this.page.getByText('Manage SLOs')).toBeVisible();
  }

  /** Navigate to SLO Management page (Actions > Health scan). Clicks "Manage SLOs" link from the list view. */
  async gotoManagement() {
    await this.page.gotoApp('slo');
    await expect(this.page.getByRole('link', { name: 'Manage SLOs' })).toBeVisible({
      timeout: 15000,
    });
    await this.page.getByRole('link', { name: 'Manage SLOs' }).click();
    await expect(this.page.getByTestId('headerControlActionsButton')).toBeVisible({
      timeout: 15000,
    });
  }

  async openFromSideMenu() {
    if (this.config.isCloud) {
      await this.page.testSubj.hover('kbnChromeNav-moreMenuTrigger');
      await this.page.testSubj.waitForSelector('side-nav-popover-More');
      await this.page.locator('#slo').click();
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
