/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class WiredStreamsSelector {
  private readonly ingestionModeSelector: Locator;
  private readonly wiredStreamsOption: Locator;
  private readonly enableWiredStreamsModal: Locator;
  private readonly enableWiredStreamsConfirmButton: Locator;
  private readonly enablingSpinner: Locator;
  private readonly wiredStreamsDescription: Locator;

  constructor(private page: Page) {
    this.ingestionModeSelector = this.page.getByTestId(
      'observabilityOnboardingIngestionModeSelector'
    );
    this.wiredStreamsOption = this.ingestionModeSelector.getByRole('button', {
      name: /wired streams/i,
    });
    this.enableWiredStreamsModal = this.page.getByTestId(
      'observabilityOnboardingEnableWiredStreamsModal'
    );
    this.enableWiredStreamsConfirmButton = this.page.getByTestId(
      'observabilityOnboardingEnableWiredStreamsConfirmButton'
    );
    this.enablingSpinner = this.page.getByTestId(
      'observabilityOnboardingWiredStreamsEnablingSpinner'
    );
    this.wiredStreamsDescription = this.page.getByTestId(
      'observabilityOnboardingWiredStreamsDescription'
    );
  }

  public async selectWiredStreamsMode(): Promise<void> {
    await expect(
      this.ingestionModeSelector,
      'Expected ingestion mode selector to be visible before selecting Wired Streams'
    ).toBeVisible();

    await this.wiredStreamsOption.click();

    // The enable confirmation modal is shown only if wired streams are not yet enabled on the cluster.
    const modalVisible = await this.enableWiredStreamsModal
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (modalVisible) {
      await this.enableWiredStreamsConfirmButton.click();

      // Spinner exists only while the enable API call is in progress.
      // If the spinner appears and never disappears, fail with a clear timeout on the spinner itself.
      let spinnerAppeared = false;
      await this.enablingSpinner
        .waitFor({ state: 'visible', timeout: 5000 })
        .then(() => (spinnerAppeared = true))
        .catch(() => undefined);

      if (spinnerAppeared) {
        await this.enablingSpinner.waitFor({ state: 'hidden', timeout: 60000 });
      }
    }

    await this.wiredStreamsDescription.waitFor({ state: 'visible', timeout: 60000 });
  }
}
