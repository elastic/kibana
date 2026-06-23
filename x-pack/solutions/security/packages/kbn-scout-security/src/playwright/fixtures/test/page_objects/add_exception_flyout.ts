/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBoxWrapper, type ScoutPage, type Locator } from '@kbn/scout';

/**
 * Page object for the "Add rule exception" / "Add exception" flyout that
 * surfaces from a detection alert's context menu. Drives the exception
 * builder, the bulk-close checkbox, and the submit button.
 */
export class AddExceptionFlyoutPage {
  public readonly itemNameInput: Locator;
  /** Underlying `<input type="checkbox">` for the bulk-close option. Specs can
   * use `expect(...).toBeEnabled()` directly on this locator. */
  public readonly bulkCloseCheckbox: Locator;
  public readonly submitButton: Locator;
  public readonly flyoutTitle: Locator;

  private readonly fieldCombo: EuiComboBoxWrapper;
  private readonly valueCombo: EuiComboBoxWrapper;

  constructor(private readonly page: ScoutPage) {
    this.flyoutTitle = this.page.testSubj.locator('exceptionFlyoutTitle');
    this.itemNameInput = this.page.testSubj.locator('exceptionFlyoutNameInput');
    this.bulkCloseCheckbox = this.page.testSubj.locator('bulkCloseAlertOnAddExceptionCheckbox');
    this.submitButton = this.page.testSubj.locator('addExceptionConfirmButton');

    this.fieldCombo = new EuiComboBoxWrapper(page, { dataTestSubj: 'fieldAutocompleteComboBox' });
    // Value picker for match operator. Runtime fields produce no autocomplete
    // suggestions, so callers must use `setEntry` (which writes the value as a
    // custom option).
    this.valueCombo = new EuiComboBoxWrapper(page, { dataTestSubj: 'valuesAutocompleteMatch' });
  }

  async waitForVisible() {
    await this.flyoutTitle.waitFor({ state: 'visible' });
  }

  /**
   * Fill the first exception entry with a field and value. Operator defaults
   * to "is" — exposed via the exception builder's prefilled state; we don't
   * touch it because the operator combo is a required EUI combo whose value
   * cannot be cleared via the standard wrapper interactions.
   */
  async setEntry({ field, value }: { field: string; value: string }) {
    await this.fieldCombo.selectSingleOption(field);
    // Runtime fields do not produce value autocomplete suggestions today
    // (the suggestions API does not forward runtime_mappings), so input is
    // treated as a custom option entered via Enter.
    await this.valueCombo.setCustomSingleOption(value);
  }

  async setItemName(name: string) {
    await this.itemNameInput.fill(name);
  }

  async tickBulkClose() {
    // Playwright's `.check()` is no-op when already checked and fails fast
    // when the checkbox is disabled, which is the right signal for callers.
    await this.bulkCloseCheckbox.check();
  }

  async submit() {
    await this.submitButton.click();
  }
}
