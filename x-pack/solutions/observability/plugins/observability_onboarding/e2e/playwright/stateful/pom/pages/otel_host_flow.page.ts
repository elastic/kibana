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
  private readonly dataReceivedIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    this.exploreLogsButton = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-logs'
    );
    this.exploreMetricsButton = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-metrics'
    );
    this.dataReceivedIndicator = this.page
      .getByTestId('observabilityOnboardingOtelHostDataProgressIndicator')
      .getByText('We are monitoring your host');
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

  public async copyCollectorDownloadSnippetToClipboard() {
    await this.page.getByTestId('observabilityOnboardingOtelLogsPanelButton').click();
  }

  public async copyCollectorStartSnippetToClipboard() {
    await this.page
      .getByTestId('observabilityOnboardingCopyableCodeBlockCopyToClipboardButton')
      .click();
  }

  public async clickHostsOverviewCTA() {
    await this.exploreMetricsButton.click();
  }

  public async clickLogsExplorationCTA() {
    await this.exploreLogsButton.click();
  }

  public async assertDataReceivedIndicator(): Promise<void> {
    await expect(
      this.dataReceivedIndicator,
      'Data received indicator should be visible'
    ).toBeVisible({ timeout: 5 * 60_000 });
  }

  public async assertLogsExplorationButtonVisible() {
    await expect(this.exploreLogsButton, 'Logs exploration button should be visible').toBeVisible();
  }
}
