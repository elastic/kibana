/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { subj } from '@kbn/test-subj-selector';
import { type ScoutPage, type Locator } from '@kbn/scout';

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

  private readonly addExceptionButtons: Record<AddExceptionButtonType, Locator>;

  constructor(private readonly page: ScoutPage) {
    this.flyoutTitle = this.page.testSubj.locator('exceptionFlyoutTitle');
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
    const entryScope = this.page.locator(
      `${subj('exceptionItemEntryContainer')} >> nth=${entryIndex}`
    );

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
   * Locator of one exception item (an "or" group) in the builder. Items are addressed by
   * position on purpose: the builder tests assert that positions keep their values when
   * neighbouring rows are added or removed.
   */
  private itemLocator(itemIndex: number): Locator {
    return this.page.locator(`${subj('exceptionEntriesContainer')} >> nth=${itemIndex}`);
  }

  /** Locator of one entry row (a nested parent and each nested child are separate rows). */
  private entryLocator(itemIndex: number, entryIndex: number): Locator {
    return this.itemLocator(itemIndex).locator(
      `${subj('exceptionItemEntryContainer')} >> nth=${entryIndex}`
    );
  }

  private fieldCombo(itemIndex: number, entryIndex: number) {
    return this.page.components.comboBox(
      'fieldAutocompleteComboBox',
      this.entryLocator(itemIndex, entryIndex)
    );
  }

  /** Picks a field that exists in the rule's index patterns (or a child of a nested parent). */
  async selectField(itemIndex: number, entryIndex: number, field: string) {
    await this.fieldCombo(itemIndex, entryIndex).setSelectedOptions([field]);
  }

  /** Types a field that is not in the index patterns and commits it as a custom option. */
  async createCustomField(itemIndex: number, entryIndex: number, field: string) {
    await this.fieldCombo(itemIndex, entryIndex).setCustomSelectedOptions([field]);
  }

  /**
   * Picks a leaf field of a nested path in the empty parent row of a new nested condition.
   * The row then shows the nested path itself (for `process.elf.sections.name` it shows
   * `process.elf.sections`) and the leaf becomes the first child row. The combo helper
   * `setSelectedOptions` cannot be used here, because it waits for the picked label to be
   * the row's selection.
   */
  async selectNestedParent(itemIndex: number, entryIndex: number, leafField: string) {
    await this.entryLocator(itemIndex, entryIndex)
      .locator(subj('fieldAutocompleteComboBox'))
      .locator(subj('comboBoxSearchInput'))
      .fill(leafField);
    await this.page.getByRole('option', { name: leafField, exact: true }).click();
  }

  /** Types into the field search box without selecting, then returns the visible options. */
  async searchFieldOptions(itemIndex: number, entryIndex: number, text: string) {
    const entryScope = this.entryLocator(itemIndex, entryIndex);
    await entryScope
      .locator(subj('fieldAutocompleteComboBox'))
      .locator(subj('comboBoxSearchInput'))
      .fill(text);
    return this.fieldCombo(itemIndex, entryIndex).getAllVisibleOptions();
  }

  /** Selected field label of every row in an item ('' for a row without a field yet). */
  async getFieldLabels(itemIndex: number): Promise<string[]> {
    const rowCount = await this.itemLocator(itemIndex)
      .locator(subj('exceptionItemEntryContainer'))
      .count();
    const labels: string[] = [];
    for (let entryIndex = 0; entryIndex < rowCount; entryIndex++) {
      const [label] = await this.fieldCombo(itemIndex, entryIndex).getSelectedOptions();
      labels.push(label ?? '');
    }
    return labels;
  }

  async getItemCount(): Promise<number> {
    return this.page.locator(subj('exceptionEntriesContainer')).count();
  }

  async setOperator(itemIndex: number, entryIndex: number, operator: string) {
    await this.selectOperator(this.entryLocator(itemIndex, entryIndex), operator);
  }

  /** Commits a free-text value on a `match` ("is") entry. */
  async setMatchValue(itemIndex: number, entryIndex: number, value: string) {
    await this.page.components
      .comboBox('valuesAutocompleteMatch', this.entryLocator(itemIndex, entryIndex))
      .setCustomSelectedOptions([value]);
  }

  /** Opens the value dropdown of a `match` entry and returns the suggestions that are visible. */
  async getMatchValueSuggestions(itemIndex: number, entryIndex: number) {
    return this.page.components
      .comboBox('valuesAutocompleteMatch', this.entryLocator(itemIndex, entryIndex))
      .getAllVisibleOptions();
  }

  /** Picks one of the suggested values of a `match` entry. */
  async selectMatchValueSuggestion(itemIndex: number, entryIndex: number, value: string) {
    await this.page.components
      .comboBox('valuesAutocompleteMatch', this.entryLocator(itemIndex, entryIndex))
      .setSelectedOptions([value]);
  }

  /**
   * Removes the value of a `match` entry the way a user does: one Backspace in the value input
   * drops the selection and leaves its text in the search box, the text is deleted too, and a
   * click elsewhere blurs the input so that the builder reports the empty value as an error.
   * Leftover search text would be committed again as a new value on Enter or on blur, because
   * the combo accepts custom options.
   */
  async removeMatchValue(itemIndex: number, entryIndex: number) {
    const valueInput = this.entryLocator(itemIndex, entryIndex)
      .locator(subj('valuesAutocompleteMatch'))
      .locator(subj('comboBoxSearchInput'));
    await valueInput.press('Backspace');
    await valueInput.fill('');
    await this.flyoutTitle.click();
  }

  /** Commits free-text values on a `match_any` ("is one of") entry. */
  async setMatchAnyValues(itemIndex: number, entryIndex: number, values: string[]) {
    await this.page.components
      .comboBox('valuesAutocompleteMatchAny', this.entryLocator(itemIndex, entryIndex))
      .setCustomSelectedOptions(values);
  }

  /** Clicks the delete button of one row; rows of all nested children count separately. */
  async deleteEntry(itemIndex: number, entryIndex: number) {
    await this.itemLocator(itemIndex)
      .locator(`${subj('builderItemEntryDeleteButton')} >> nth=${entryIndex}`)
      .click();
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
