/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class AutoDetectFlowPage {
  page: Page;

  private readonly copyToClipboardButton: Locator;
  private readonly receivedDataIndicator: Locator;
  private readonly autoDetectSystemIntegrationActionLink: Locator;
  private readonly codeBlock: Locator;

  constructor(page: Page) {
    this.page = page;
    this.copyToClipboardButton = this.page.getByTestId(
      'observabilityOnboardingCopyToClipboardButton'
    );
    this.receivedDataIndicator = this.page
      .getByTestId('observabilityOnboardingAutoDetectPanelDataReceivedProgressIndicator')
      .getByText('Your data is ready to explore!');
    this.autoDetectSystemIntegrationActionLink = this.page.getByTestId(
      'observabilityOnboardingDataIngestStatusActionLink-inventory-host-details'
    );
    this.codeBlock = this.page.getByTestId('observabilityOnboardingAutoDetectPanelCodeSnippet');
  }

  public async copyToClipboard() {
    await this.copyToClipboardButton.click();
  }

  public async assertVisibilityCodeBlock() {
    await expect(this.codeBlock, 'Code block should be visible').toBeVisible();
  }

  public async assertReceivedDataIndicator() {
    await expect(
      this.receivedDataIndicator,
      'Received data indicator should be visible'
    ).toBeVisible();
  }

  public async clickAutoDetectSystemIntegrationCTA() {
    await this.autoDetectSystemIntegrationActionLink.click();
  }
}
