/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Page, type Locator } from '@playwright/test';

export class FleetAgentsOverviewPage {
  page: Page;

  private readonly addAgentCTA: Locator;
  private readonly createPolicyButton: Locator;
  private readonly agentPolicyDescription: Locator;
  private readonly enrollInFleetRadioButton: Locator;
  private readonly enrollmentCodeBlock: Locator;
  private readonly enrollmentCopyButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addAgentCTA = this.page.getByTestId('addAgentButton');
    this.createPolicyButton = this.page.getByTestId('createPolicyBtn');
    this.agentPolicyDescription = this.page.getByTestId('agentPolicyDescription');
    this.enrollInFleetRadioButton = this.page.getByTestId('agentFlyoutManagedRadioButtons');
    this.enrollmentCodeBlock = this.page.getByTestId('enrollmentInstructionsCodeBlock');
    this.enrollmentCopyButton = this.page.getByTestId('euiCodeBlockCopy');
  }

  public async clickAddAgentCTA() {
    await this.addAgentCTA.click();
  }

  public async clickCreatePolicy() {
    await this.createPolicyButton.click();
  }

  public async assertAgentPolicyCreated() {
    await expect(
      this.agentPolicyDescription,
      'Agent policy description should be visible when created'
    ).toBeVisible({ timeout: 60_000 });
  }

  public async selectEnrollInFleet() {
    await this.enrollInFleetRadioButton.click();
  }

  public async assertVisibilityCodeBlock() {
    await expect(this.enrollmentCodeBlock, 'Code block should be visible').toBeVisible();
  }

  public async scrollToCodeBlockCopyButton() {
    await this.enrollmentCopyButton.scrollIntoViewIfNeeded();
  }

  public async copyToClipboard() {
    await this.enrollmentCopyButton.click();
  }
}
