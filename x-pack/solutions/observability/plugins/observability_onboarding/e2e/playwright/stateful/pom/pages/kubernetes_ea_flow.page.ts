/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class KubernetesEAFlowPage {
  page: Page;

  private readonly receivedDataIndicatorKubernetes: Locator;
  private readonly kubernetesAgentExploreDataActionLink: Locator;
  private readonly codeBlock: Locator;
  private readonly copyToClipboardButton: Locator;

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

  public async clickKubernetesAgentCTA() {
    await this.kubernetesAgentExploreDataActionLink.click();
  }
}
