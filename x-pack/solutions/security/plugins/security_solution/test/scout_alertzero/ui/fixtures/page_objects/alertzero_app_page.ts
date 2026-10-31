/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/**
 * Page object for the AlertZero app as the onboarding suite drives it: the
 * onboarding wizard (intro → worker selection → enable), the post-enable
 * queue, and the Watch settings surface. Every static `data-test-subj` the
 * specs assert on lives here as a `readonly` locator; ids composed with a
 * worker id are exposed as named methods.
 */
export class AlertZeroAppPage {
  // Onboarding wizard.
  public readonly introPromo: Locator;
  public readonly uiPreview: Locator;
  public readonly continueButton: Locator;
  public readonly continueDisabledReason: Locator;
  public readonly selectedCount: Locator;
  public readonly enableButton: Locator;
  public readonly readMoreLink: Locator;
  public readonly watchSettingsLink: Locator;
  public readonly noModelCallout: Locator;
  public readonly noModelFeatureSettingsButton: Locator;
  public readonly featureSettingsLink: Locator;
  // Post-enable queue and gate surfaces.
  public readonly proposalsTrendChartRow: Locator;
  public readonly privilegesGate: Locator;
  // Watch settings.
  public readonly watchSettingsSave: Locator;
  public readonly watchUnsavedChangesBadge: Locator;

  constructor(private readonly page: ScoutPage) {
    this.introPromo = this.page.testSubj.locator('alertZeroOnboardingIntroPromo');
    this.uiPreview = this.page.testSubj.locator('alertZeroOnboardingUiPreview');
    this.continueButton = this.page.testSubj.locator('alertZeroOnboardingContinueButton');
    this.continueDisabledReason = this.page.testSubj.locator(
      'alertZeroOnboardingContinueDisabledReason'
    );
    this.selectedCount = this.page.testSubj.locator('alertZeroOnboardingSelectedCount');
    this.enableButton = this.page.testSubj.locator('alertZeroOnboardingEnableButton');
    this.readMoreLink = this.page.testSubj.locator('alertZeroOnboardingReadMoreLink');
    this.watchSettingsLink = this.page.testSubj.locator('alertZeroOnboardingWatchSettingsLink');
    this.noModelCallout = this.page.testSubj.locator('alertZeroOnboardingNoModelCallout');
    this.noModelFeatureSettingsButton = this.page.testSubj.locator(
      'alertZeroOnboardingNoModelFeatureSettingsButton'
    );
    this.featureSettingsLink = this.page.testSubj.locator('alertZeroOnboardingFeatureSettingsLink');
    this.proposalsTrendChartRow = this.page.testSubj.locator('alertZeroProposalsTrendChartRow');
    this.privilegesGate = this.page.testSubj.locator('alertzeroPrivilegesGate');
    this.watchSettingsSave = this.page.testSubj.locator('alertZeroWatchSettingsSave');
    this.watchUnsavedChangesBadge = this.page.testSubj.locator('alertZeroWatchUnsavedChangesBadge');
  }

  /** Worker-selection card, keyed by worker id. */
  workerCard(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroOnboardingWorkerCard-${workerId}`);
  }

  /** Worker-selection toggle, keyed by worker id. */
  workerToggle(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroOnboardingWorkerToggle-${workerId}`);
  }

  /** Watch settings enabled switch, keyed by worker id. */
  workerEnabledSwitch(workerId: string): Locator {
    return this.page.testSubj.locator(`alertZeroWorkerEnabledSwitch-${workerId}`);
  }

  /**
   * Advances past the intro step and waits for the worker-selection step
   * (the selected-count footer is only rendered there).
   */
  async advanceToWorkerSelection(): Promise<void> {
    await this.continueButton.click();
    await this.selectedCount.waitFor({ state: 'visible' });
  }

  /**
   * Advances past the intro and clicks "Enable and run" without waiting for
   * the fan-out to settle.
   */
  async enableAll(): Promise<void> {
    await this.advanceToWorkerSelection();
    await this.enableButton.click();
  }

  /** Waits for the post-enable queue to replace the onboarding wizard. */
  async waitForQueue(timeout: number = 120_000): Promise<void> {
    await this.proposalsTrendChartRow.waitFor({ state: 'visible', timeout });
  }

  /** Expands the collapsed "Closed Actions" bucket on the queue. */
  async openClosedBucket(): Promise<void> {
    await this.page.getByRole('button', { name: /Closed Actions/ }).click();
  }

  /** Queue row for a seeded proposal, keyed by its title (`aria-label`). */
  proposalRow(title: string): Locator {
    return this.page.locator(`[aria-label="${title}"]`);
  }
}
