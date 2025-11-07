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
  private readonly createNewAgentPolicyLink: Locator;
  private readonly createPolicyButton: Locator;
  private readonly agentPolicyDescription: Locator;
  private readonly enrollInFleetRadioButton: Locator;
  private readonly codeBlockPlatformSelectorButton: Locator;
  private readonly enrollmentCodeBlock: Locator;
  private readonly enrollmentCopyButton: Locator;
  private readonly confirmedAgentEnrollmentCallout: Locator;
  private readonly incomingDataConfirmedCallout: Locator;

  constructor(page: Page) {
    this.page = page;

    this.addAgentCTA = this.page.getByTestId('addAgentButton');
    this.createNewAgentPolicyLink = this.page.getByTestId('createNewAgentPolicyLink');
    this.createPolicyButton = this.page.getByTestId('createPolicyBtn');
    this.agentPolicyDescription = this.page.getByTestId('agentPolicyDescription');
    this.enrollInFleetRadioButton = this.page.getByTestId('agentFlyoutManagedRadioButtons');
    this.codeBlockPlatformSelectorButton = this.page.getByTestId('platformSelectorExtended');
    this.enrollmentCodeBlock = this.page.getByTestId('enrollmentInstructionsCodeBlock');
    this.enrollmentCopyButton = this.page.getByTestId('euiCodeBlockCopy');
    this.confirmedAgentEnrollmentCallout = this.page.getByTestId('ConfirmAgentEnrollmentCallOut');
    this.incomingDataConfirmedCallout = this.page.getByTestId('IncomingDataConfirmedCallOut');
  }

  public async clickAddAgentCTA() {
    await this.addAgentCTA.click();
  }

  public async maybeClickCreateNewAgentPolicyLink() {
    await this.createNewAgentPolicyLink.or(this.createPolicyButton).click({ trial: true });

    if (await this.createNewAgentPolicyLink.isVisible()) {
      await this.createNewAgentPolicyLink.click();
    }
  }

  public async clickCreatePolicyButton() {
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

  public async clickCodeBlockPlatformSelectorButton() {
    await this.codeBlockPlatformSelectorButton.click();
  }

  public async selectPlatform(platform: string) {
    await this.page.getByText(platform).click();
  }

  public async assertVisibilityCodeBlock() {
    await expect(this.enrollmentCodeBlock, 'Code block should be visible').toBeVisible();
  }

  public async copyToClipboard() {
    await this.enrollmentCopyButton.click();
  }

  public async assertAgentEnrolled() {
    await expect(
      this.confirmedAgentEnrollmentCallout,
      'Confirmed agent enrollment callout should be visible'
    ).toBeVisible({ timeout: 60_000 * 3 });
  }

  public async assertIncomingDataConfirmed() {
    await expect(
      this.incomingDataConfirmedCallout,
      'Incoming data confirmed callout should be visible'
    ).toBeVisible({ timeout: 60_000 * 5 });
  }
}
