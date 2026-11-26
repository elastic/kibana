/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { subj } from '@kbn/test-subj-selector';
import { type ScoutPage, type Locator } from '@kbn/scout';
import { expect } from '../../../../../ui';

export enum AddExceptionButtonType {
  OR = 'or',
  AND = 'and',
  NESTED = 'nested',
}

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

  private readonly entryContainers: Locator;
  private readonly addExceptionButtons: Record<AddExceptionButtonType, Locator>;

  constructor(private readonly page: ScoutPage) {
    this.flyoutTitle = this.page.testSubj.locator('exceptionFlyoutTitle');
    this.entryContainers = this.page.testSubj.locator('exceptionItemEntryContainer');
    this.itemNameInput = this.page.testSubj.locator('exceptionFlyoutNameInput');
    this.bulkCloseCheckbox = this.page.testSubj.locator('bulkCloseAlertOnAddExceptionCheckbox');
    this.submitButton = this.page.testSubj.locator('addExceptionConfirmButton');

    this.addExceptionButtons = {
      [AddExceptionButtonType.OR]: page.testSubj.locator('exceptionsOrButton'),
      [AddExceptionButtonType.AND]: page.testSubj.locator('exceptionsAndButton'),
      [AddExceptionButtonType.NESTED]: page.testSubj.locator('exceptionsNestedButton'),
    };
  }

  async waitForVisible() {
    await this.flyoutTitle.waitFor({ state: 'visible' });
  }

  async addException(buttonType: AddExceptionButtonType) {
    await this.addExceptionButtons[buttonType].click();
  }

  async fillConditionEntry({
    entryIndex,
    field,
    operator,
    value,
  }: {
    entryIndex: number;
    field: string;
    operator: string;
    value: string;
  }) {
    const entryScope = await this.entryAt(entryIndex);

    // Scope each combo to this entry (there can be several) via the helper's scope arg.
    const fieldCombo = this.page.components.comboBox('fieldAutocompleteComboBox', entryScope);
    const valueCombo = this.page.components.comboBox('valuesAutocompleteMatch', entryScope);

    // Field is an existing option (type-to-filter, then select); value is committed
    // as a custom onCreateOption match. Both combos start empty, so no clear is needed.
    await fieldCombo.setSelectedOptions([field]);
    await this.selectOperator(entryScope, operator);
    await valueCombo.setCustomSelectedOptions([value]);
  }

  /**
   * Manually selects an operator on the given condition entry.
   *
   * We open the dropdown and click the option directly rather than routing
   * through the combobox helper: the operator combo is a required EUI combobox
   * (`isClearable={false}`) that already has a value selected, so picking from
   * the open list is unambiguous.
   * @param entryScope locator of the `exceptionItemEntryContainer` of the entry
   * @param operator
   */
  private async selectOperator(entryScope: Locator, operator: string) {
    const operatorCombo = entryScope.locator(subj('operatorAutocompleteComboBox'));
    // Open the dropdown
    await operatorCombo.locator(subj('comboBoxToggleListButton')).click();
    await this.page.getByRole('option', { name: operator, exact: true }).click();
  }

  /**
   * Picks one condition of the builder by position. It first waits until the builder shows more
   * conditions than the position, so a position that does not exist fails here with a clear message.
   */
  private async entryAt(index: number): Promise<Locator> {
    await expect.poll(() => this.entryContainers.count()).toBeGreaterThan(index);
    // eslint-disable-next-line playwright/no-nth-methods -- condition rows have no identity of their own; callers name the position
    const entry = this.entryContainers.nth(index);
    await entry.waitFor({ state: 'visible' });
    return entry;
  }

  /**
   * Combo box of the only condition of the builder, which is where a new flyout starts. With
   * several conditions the locator matches more than one element and Playwright reports it.
   */
  private onlyEntryCombo(comboBoxTestSubj: string) {
    return this.page.components.comboBox(comboBoxTestSubj, this.entryContainers);
  }

  /** Picks a field that exists in the rule's index patterns in the condition at `entryIndex`. */
  async selectField(field: string, entryIndex = 0) {
    const entryScope = await this.entryAt(entryIndex);
    await this.page.components
      .comboBox('fieldAutocompleteComboBox', entryScope)
      .setSelectedOptions([field]);
  }

  /**
   * Picks a leaf of a nested field in the condition at `entryIndex`. The row then shows the nested
   * parent path instead of the leaf, so this does not wait for the leaf to show as the selection.
   */
  async selectNestedLeafField(field: string, entryIndex: number) {
    const entryScope = await this.entryAt(entryIndex);
    await entryScope
      .locator(subj('fieldAutocompleteComboBox'))
      .locator(subj('comboBoxSearchInput'))
      .fill(field);
    await this.page.getByRole('option', { name: field, exact: true }).click();
  }

  /** Selected field of every condition row, in order. A row without a field reads as an empty string. */
  async getConditionFields(): Promise<string[]> {
    return this.entryContainers
      .locator(subj('fieldAutocompleteComboBox'))
      .locator(subj('comboBoxSearchInput'))
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
  }

  /** Types into the field search box without selecting, then returns the visible options. */
  async searchFieldOptions(text: string) {
    await this.entryContainers
      .locator(subj('fieldAutocompleteComboBox'))
      .locator(subj('comboBoxSearchInput'))
      .fill(text);
    return this.onlyEntryCombo('fieldAutocompleteComboBox').getAllVisibleOptions();
  }

  /** Opens the value dropdown of the `match` ("is") condition and returns the visible suggestions. */
  async getMatchValueSuggestions() {
    return this.onlyEntryCombo('valuesAutocompleteMatch').getAllVisibleOptions();
  }

  /** Picks one of the suggested values of the `match` ("is") condition. */
  async selectMatchValueSuggestion(value: string) {
    await this.onlyEntryCombo('valuesAutocompleteMatch').setSelectedOptions([value]);
  }

  async setExceptionName(name: string) {
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
