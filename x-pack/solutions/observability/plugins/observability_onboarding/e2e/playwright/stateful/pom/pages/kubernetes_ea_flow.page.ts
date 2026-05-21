/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class KubernetesEAFlowPage {
  page: Page;

  private readonly kubernetesAgentExploreDataActionLink: Locator;
  private readonly codeBlock: Locator;
  private readonly copyToClipboardButton: Locator;
  private readonly exploreLogsButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.kubernetesAgentExploreDataActionLink = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c'
    );
    this.codeBlock = this.page.getByTestId('observabilityOnboardingKubernetesPanelCodeSnippet');
    this.copyToClipboardButton = this.page.getByTestId(
      'observabilityOnboardingCopyToClipboardButton'
    );
    this.exploreLogsButton = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-logs'
    );
  }

  public async assertVisibilityCodeBlock() {
    await expect(this.codeBlock, 'Code block should be visible').toBeVisible();
  }

  public async copyToClipboard() {
    await this.copyToClipboardButton.click();
  }

  public async assertReceivedDataIndicatorKubernetes() {
    await expect(
      this.exploreLogsButton,
      'Explore logs action link should be visible after data is detected'
    ).toBeVisible();
  }

  public async clickKubernetesAgentCTA() {
    await this.kubernetesAgentExploreDataActionLink.click();
  }

  public async clickExploreLogsCTA() {
    await this.exploreLogsButton.click();
  }
}
