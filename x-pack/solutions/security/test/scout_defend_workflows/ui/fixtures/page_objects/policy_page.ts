/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, Locator } from '@kbn/scout';

const ROUTES = {
  policyList: '/app/security/administration/policy',
};

export class PolicyPage {
  readonly policyListPage: Locator;
  readonly policyDetailsPage: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.policyListPage = this.page.testSubj.locator('policyListPage');
    this.policyDetailsPage = this.page.testSubj.locator('policyDetailsPage');
    this.saveButton = this.page.testSubj.locator('policyDetailsSaveButton');
    this.cancelButton = this.page.testSubj.locator('policyDetailsCancelButton');
  }

  async navigateToList() {
    await this.page.goto(ROUTES.policyList);
    await this.page.waitForLoadingIndicatorHidden();
  }

  async navigateToDetails(policyId: string) {
    await this.page.goto(`${ROUTES.policyList}/${policyId}`);
    await this.page.waitForLoadingIndicatorHidden();
  }

  async confirmAndSave() {
    await this.saveButton.click();
    const confirmModal = this.page.testSubj.locator('policyDetailsConfirmModal');
    await confirmModal.waitFor({ state: 'visible' });
    await confirmModal.getByRole('button', { name: 'Save and deploy changes' }).click();
    await confirmModal.waitFor({ state: 'hidden' });
  }

  async toggleAdvancedSettings() {
    const showHideButton = this.page.testSubj.locator(
      'endpointPolicy-form-advancedSection-showHideButton'
    );
    await showHideButton.click();
  }

  async isAdvancedSettingsExpanded(): Promise<boolean> {
    const container = this.page.testSubj.locator(
      'endpointPolicy-form-advancedSection-settingsContainer'
    );
    return container.isVisible();
  }
}
