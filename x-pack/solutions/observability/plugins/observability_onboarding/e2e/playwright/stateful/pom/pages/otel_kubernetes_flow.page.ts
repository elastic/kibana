/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type BrowserContext, type Locator } from '@playwright/test';
import { DiscoverValidationPage } from './discover_validation.page';

export class OtelKubernetesFlowPage {
  page: Page;
  context: BrowserContext;

  private readonly exploreLogsButton: Locator;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;

    this.exploreLogsButton = this.page.getByText('Explore logs');
  }

  public async copyHelmRepositorySnippetToClipboard() {
    await this.page
      .getByTestId('observabilityOnboardingOtelKubernetesPanelAddRepositoryCopyToClipboard')
      .click();
  }

  public async copyInstallStackSnippetToClipboard() {
    await this.page
      .getByTestId('observabilityOnboardingOtelKubernetesPanelInstallStackCopyToClipboard')
      .click();
  }

  public async switchInstrumentationInstructions(language: 'nodejs' | 'java' | 'python' | 'go') {
    await this.page.getByTestId(language).click();
  }

  public async getAnnotateAllResourceSnippet() {
    return await this.page
      .getByTestId('observabilityOnboardingOtelKubernetesPanelAnnotateAllResourcesSnippet')
      .textContent();
  }

  public async getRestartDeploymentSnippet() {
    return await this.page
      .getByTestId('observabilityOnboardingOtelKubernetesPanelRestartDeploymentSnippet')
      .textContent();
  }

  public async openClusterOverviewDashboardInNewTab(): Promise<Page> {
    const dashboardURL = await this.page
      .getByTestId(
        'observabilityOnboardingDataIngestStatusActionLink-kubernetes_otel-cluster-overview'
      )
      .getAttribute('href');

    if (dashboardURL) {
      const newPage = await this.context.newPage();

      await newPage.goto(dashboardURL);

      return newPage;
    } else {
      throw new Error('Dashboard URL not found');
    }
  }

  public async openServiceInventoryInNewTab(): Promise<Page> {
    const serviceInventoryURL = await this.page
      .getByTestId('observabilityOnboardingDataIngestStatusActionLink-services')
      .getAttribute('href');

    if (serviceInventoryURL) {
      const newPage = await this.context.newPage();

      await newPage.goto(serviceInventoryURL);

      return newPage;
    } else {
      throw new Error('Service inventory URL not found');
    }
  }

  public async assertLogsExplorationButtonVisible() {
    await expect(this.exploreLogsButton, 'Logs exploration button should be visible').toBeVisible();
  }

  public async clickExploreLogsCTA() {
    await this.exploreLogsButton.click();
  }

  public async clickExploreLogsAndGetDiscoverValidation(): Promise<DiscoverValidationPage> {
    await this.exploreLogsButton.click();
    return new DiscoverValidationPage(this.page);
  }
}
