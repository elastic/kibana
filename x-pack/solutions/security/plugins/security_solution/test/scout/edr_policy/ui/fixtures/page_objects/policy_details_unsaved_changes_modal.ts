/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-security';

/** Modal shown when leaving a policy details tab with unsaved changes. */
export class PolicyDetailsUnsavedChangesModal {
  readonly modal: Locator;
  readonly backButton: Locator;
  readonly continueButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.modal = this.page.testSubj.locator('policyDetailsUnsavedChangesModal');
    this.backButton = this.modal.getByTestId('confirmModalCancelButton');
    this.continueButton = this.modal.getByTestId('confirmModalConfirmButton');
  }

  async back(): Promise<void> {
    await this.backButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }

  async continueWithoutSaving(): Promise<void> {
    await this.continueButton.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
}
