/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';

/** Cases "add to existing case" modal and the create-case flyout it opens. */
export class AddToCaseModal {
  public readonly modal: Locator;
  public readonly createCaseButton: Locator;
  public readonly createCaseFlyout: Locator;
  public readonly createCaseTitleInput: Locator;
  public readonly createCaseDescriptionInput: Locator;
  public readonly createCaseSubmitButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.modal = this.page.testSubj.locator('all-cases-modal');
    this.createCaseButton = this.page.testSubj.locator('cases-table-add-case-filter-bar');
    this.createCaseFlyout = this.page.testSubj.locator('create-case-flyout');
    this.createCaseTitleInput = this.createCaseFlyout.locator(
      '[data-test-subj="caseTitle"] [data-test-subj="input"]'
    );
    this.createCaseDescriptionInput = this.createCaseFlyout.locator(
      'textarea.euiMarkdownEditorTextArea'
    );
    this.createCaseSubmitButton = this.page.testSubj.locator('create-case-submit');
  }

  caseSelectButton(caseId: string): Locator {
    return this.page.testSubj.locator(`cases-table-row-select-${caseId}`);
  }

  async selectExistingCase(caseId: string): Promise<void> {
    await expect(this.modal).toBeVisible();
    await this.caseSelectButton(caseId).click();
  }

  async createCase(title: string, description: string): Promise<void> {
    await expect(this.modal).toBeVisible();
    await this.createCaseButton.click();
    await expect(this.createCaseFlyout).toBeVisible();
    await this.createCaseTitleInput.fill(title);
    await this.createCaseDescriptionInput.fill(description);
    await this.createCaseSubmitButton.click();
  }
}
