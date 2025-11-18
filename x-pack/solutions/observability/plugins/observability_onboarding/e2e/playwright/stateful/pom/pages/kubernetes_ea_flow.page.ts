/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';
import { DiscoverValidationPage } from './discover_validation.page';

export class KubernetesEAFlowPage {
  page: Page;

  private readonly receivedDataIndicatorKubernetes: Locator;
  private readonly kubernetesAgentExploreDataActionLink: Locator;
  private readonly codeBlock: Locator;
  private readonly copyToClipboardButton: Locator;
  private readonly logsDataReceivedIndicator: Locator;
  private readonly exploreLogsButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.receivedDataIndicatorKubernetes = this.page
      .getByTestId('observabilityOnboardingKubernetesPanelDataProgressIndicator')
      .getByText('We are monitoring your cluster');
    this.kubernetesAgentExploreDataActionLink = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c'
    );
    this.codeBlock = this.page.getByTestId('observabilityOnboardingKubernetesPanelCodeSnippet');
    this.copyToClipboardButton = this.page.getByTestId(
      'observabilityOnboardingCopyToClipboardButton'
    );
    this.logsDataReceivedIndicator = this.page
      .getByTestId('observabilityOnboardingKubernetesPanelDataProgressIndicator')
      .getByText('We are monitoring your cluster');

    this.exploreLogsButton = this.page.getByText('Explore logs');
  }

  public async assertVisibilityCodeBlock() {
    await expect(this.codeBlock, 'Code block should be visible').toBeVisible();
  }

  public async copyToClipboard() {
    await this.copyToClipboardButton.click();
  }

  public async assertReceivedDataIndicatorKubernetes() {
    await expect(
      this.receivedDataIndicatorKubernetes,
      'Received data indicator should be visible'
    ).toBeVisible();
  }

  public async assertLogsDataReceivedIndicator() {
    await expect(
      this.logsDataReceivedIndicator,
      'Logs data received indicator should be visible'
    ).toBeVisible();
  }

  public async clickKubernetesAgentCTA() {
    await this.kubernetesAgentExploreDataActionLink.click();
  }

  public async clickExploreLogsCTA() {
    await this.exploreLogsButton.click();
  }

  public async clickExploreLogsAndGetDiscoverValidation(): Promise<DiscoverValidationPage> {
    await this.exploreLogsButton.click();
    return new DiscoverValidationPage(this.page);
  }
}
