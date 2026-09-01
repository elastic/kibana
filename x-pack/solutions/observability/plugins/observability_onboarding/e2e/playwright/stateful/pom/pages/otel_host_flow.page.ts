/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class OtelHostFlowPage {
  page: Page;

  private readonly exploreLogsButton: Locator;
  private readonly exploreMetricsButton: Locator;
  private readonly installCodeBlock: Locator;
  private readonly startCodeBlock: Locator;

  constructor(page: Page) {
    this.page = page;

    this.exploreLogsButton = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-logs'
    );
    this.exploreMetricsButton = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-metrics'
    );
    this.installCodeBlock = this.page.getByTestId('observabilityOnboardingOtelLogsPanelCodeBlock');
    this.startCodeBlock = this.page
      .getByTestId('observabilityOnboardingOtelLogsStartPanelCodeBlock')
      // Fallback for Kibana builds that predate the start-step test id: both the
      // v1 OTel flow and the v2 host page render exactly two code blocks — the
      // install snippet first, then the start snippet. On builds that have the
      // test id, both sides of the or() resolve to the same element.
      .or(this.page.locator('code.euiCodeBlock__code').nth(1));
  }

  public async selectPlatform(osName: string) {
    const platformLabel = this.getPlatformLabel(osName);
    await this.page.getByRole('button', { name: platformLabel, exact: true }).click();
  }

  private getPlatformLabel(osName: string): string {
    switch (osName.toLowerCase()) {
      case 'darwin':
        return 'Mac';
      case 'windows':
      case 'win32':
        return 'Windows';
      case 'linux':
      default:
        return 'Linux';
    }
  }

  /** Reads the collector download command. v2 host pages hide the standalone copy button. */
  public async getCollectorDownloadSnippet(): Promise<string> {
    return this.readCodeBlock(this.installCodeBlock);
  }

  /** Reads the collector start command. v2 host pages hide the standalone copy button. */
  public async getCollectorStartSnippet(): Promise<string> {
    return this.readCodeBlock(this.startCodeBlock);
  }

  public async clickHostsOverviewCTA() {
    await this.exploreMetricsButton.click();
  }

  public async clickLogsExplorationCTA() {
    await this.exploreLogsButton.click();
  }

  public async assertDataReceivedIndicator(): Promise<void> {
    await expect(
      this.exploreLogsButton,
      'Explore logs action link should be visible after data is detected'
    ).toBeVisible();
  }

  private async readCodeBlock(codeBlock: Locator): Promise<string> {
    await codeBlock.waitFor({ state: 'visible' });
    return ((await codeBlock.textContent()) ?? '').trim();
  }
}
