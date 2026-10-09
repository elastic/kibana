/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';

/**
 * Detection rule edit page (`/app/security/rules/id/<id>/edit`) and its save flow.
 */
export class RuleEditPage {
  readonly saveButton: Locator;
  readonly eqlQueryInput: Locator;
  readonly saveWithWarningsModal: Locator;
  readonly saveWithWarningsConfirmButton: Locator;
  readonly ruleDetailsAboutSection: Locator;

  constructor(private readonly page: ScoutPage) {
    this.saveButton = this.page.testSubj.locator('ruleEditSubmitButton');
    this.eqlQueryInput = this.page.testSubj.locator('eqlQueryBarTextInput');
    this.saveWithWarningsModal = this.page.testSubj.locator('save-with-errors-confirmation-modal');
    this.saveWithWarningsConfirmButton = this.saveWithWarningsModal.getByTestId(
      'confirmModalConfirmButton'
    );
    this.ruleDetailsAboutSection = this.page.testSubj.locator('aboutRule');
  }

  async navigate(ruleId: string): Promise<void> {
    await this.page.gotoApp(`security/rules/id/${ruleId}/edit`);
    await this.saveButton.waitFor({ state: 'visible' });
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async confirmSaveWithWarnings(): Promise<void> {
    await this.saveWithWarningsConfirmButton.click();
  }
}
