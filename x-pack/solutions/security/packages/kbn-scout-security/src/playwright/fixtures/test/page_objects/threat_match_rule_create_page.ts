/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { APP_LOAD_TIMEOUT_MS } from '../../../constants/timeouts';
import { expect } from '../../../../../ui';

/**
 * Rule creation flow for Indicator match (threat match) rules — threat index
 * and threat-field mapping controls.
 */
export class ThreatMatchRuleCreatePage {
  readonly andButton: Locator;
  readonly orButton: Locator;
  readonly defineContinueButton: Locator;
  readonly defineEditButton: Locator;
  readonly invalidMappingMessage: Locator;
  readonly atLeastOneMatchMessage: Locator;
  readonly atLeastOneIndexPatternMessage: Locator;
  readonly customQueryRequiredMessage: Locator;
  readonly indicatorQueryRequiredMessage: Locator;
  readonly ruleIndexInput: Locator;
  readonly indicatorIndexInput: Locator;
  readonly customQueryInput: Locator;
  readonly indicatorQueryInput: Locator;
  readonly scheduleIntervalAmount: Locator;
  readonly scheduleIntervalUnit: Locator;
  readonly scheduleLookbackAmount: Locator;
  readonly scheduleLookbackUnit: Locator;

  constructor(private readonly page: ScoutPage) {
    this.andButton = this.page.testSubj.locator('andButton');
    this.orButton = this.page.testSubj.locator('orButton');
    this.defineContinueButton = this.page.testSubj.locator('define-continue');
    // Shown once the Define step has been accepted and collapsed
    this.defineEditButton = this.page.testSubj.locator('edit-define-rule');
    this.invalidMappingMessage = this.page.getByText(
      'All matches require both a field and threat index field.'
    );
    this.atLeastOneMatchMessage = this.page.getByText('At least one indicator match is required.');
    this.atLeastOneIndexPatternMessage = this.page.getByText(
      'A minimum of one index pattern is required.'
    );
    this.customQueryRequiredMessage = this.page.getByText('A custom query is required.');
    this.indicatorQueryRequiredMessage = this.page.getByText(
      'An indicator index query is required.'
    );
    this.ruleIndexInput = this.page.testSubj
      .locator('detectionEngineStepDefineRuleIndices')
      .locator('[data-test-subj="comboBoxInput"]');
    this.indicatorIndexInput = this.page.testSubj
      .locator('ruleThreatMatchIndicesField')
      .locator('[data-test-subj="comboBoxInput"]');
    this.customQueryInput = this.page.testSubj
      .locator('detectionEngineStepDefineRuleQueryBar')
      .locator('[data-test-subj="queryInput"]');
    this.indicatorQueryInput = this.page.testSubj
      .locator('ruleThreatMatchQueryField')
      .locator('[data-test-subj="queryInput"]');
    const scheduleInterval = this.page.testSubj.locator('detectionEngineStepScheduleRuleInterval');
    const scheduleLookback = this.page.testSubj.locator('detectionEngineStepScheduleRuleFrom');
    this.scheduleIntervalAmount = scheduleInterval.locator('[data-test-subj="interval"]');
    this.scheduleIntervalUnit = scheduleInterval.locator('[data-test-subj="timeType"]');
    this.scheduleLookbackAmount = scheduleLookback.locator('[data-test-subj="interval"]');
    this.scheduleLookbackUnit = scheduleLookback.locator('[data-test-subj="timeType"]');
  }

  private async dismissProjectPickerTour(): Promise<void> {
    await this.page.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
  }

  /**
   * Opens rule creation in the given space, selects Indicator match, enters the
   * threat index, and waits for the threat-field autocomplete combobox.
   */
  async navigateToThreatMatchForm(params: {
    kbnUrl: KibanaUrl;
    spaceId: string;
    testIndex: string;
  }): Promise<void> {
    const { kbnUrl, spaceId, testIndex } = params;

    await this.dismissProjectPickerTour();
    await this.page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));

    // Rule type cards may take a while to render in CI
    await this.page.testSubj.waitForSelector('threatMatchRuleType', {
      state: 'visible',
      timeout: 30_000,
    });
    await this.page.testSubj.click('threatMatchRuleType');

    const threatIndexField = this.page.testSubj.locator('ruleThreatMatchIndicesField');
    await threatIndexField.locator('input').fill(testIndex);
    await this.page.keyboard.press('Enter');

    await this.page.testSubj.waitForSelector('threatFieldInputFormRow', {
      state: 'visible',
      timeout: 15_000,
    });
  }

  /**
   * Types a field name into the threat-field combobox and returns the matching
   * option locator for presence/absence assertions (without selecting it).
   */
  async openThreatFieldDropdownOption(fieldName: string): Promise<Locator> {
    const comboBoxInput = this.page.testSubj
      .locator('threatFieldInputFormRow')
      .locator('[data-test-subj="fieldAutocompleteComboBox"]')
      .locator('input');

    await comboBoxInput.click();
    await comboBoxInput.fill(fieldName);

    return this.page.getByRole('option', { name: fieldName });
  }

  /**
   * Opens rule creation in the given space and selects the Indicator match rule type.
   */
  async gotoCreateIndicatorMatchRule(params: {
    kbnUrl: KibanaUrl;
    spaceId: string;
  }): Promise<void> {
    const { kbnUrl, spaceId } = params;

    await this.dismissProjectPickerTour();
    await this.page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));
    await this.waitForFormReady(this.customQueryInput);
    await this.page.testSubj.locator('threatMatchRuleType').click();
    await this.page.testSubj.locator('ruleThreatMatchMappingField').waitFor({ state: 'visible' });
    // Selecting the rule type renders the Indicator match fields, which start out disabled too
    await this.waitForFormReady(this.customQueryInput, this.indicatorQueryInput);
  }

  /**
   * Waits until the create rule form has finished initializing.
   *
   * The form stays disabled while user info, lists and the data view initialize. The query
   * inputs are the controls that reliably stay `disabled` until initialization is done, and they
   * are the first thing the tests interact with afterwards, so waiting for them to become enabled
   * is the readiness signal.
   */
  private async waitForFormReady(...queryInputs: Locator[]): Promise<void> {
    for (const queryInput of queryInputs) {
      await queryInput.and(this.page.locator(':enabled')).waitFor({
        state: 'visible',
        timeout: APP_LOAD_TIMEOUT_MS,
      });
    }
  }

  /**
   * Replaces the source index patterns and the indicator index patterns of the Define step.
   */
  async setIndexPatterns({
    index,
    threatIndex,
  }: {
    index: readonly string[];
    threatIndex: readonly string[];
  }): Promise<void> {
    await this.replaceComboBoxValues('detectionEngineStepDefineRuleIndices', index);
    await this.replaceComboBoxValues('ruleThreatMatchIndicesField', threatIndex);
  }

  private async replaceComboBoxValues(
    containerTestSubj: string,
    values: readonly string[]
  ): Promise<void> {
    const container = this.page.testSubj.locator(containerTestSubj);
    await container.locator('[data-test-subj="comboBoxClearButton"]').click();
    const input = container.locator('[data-test-subj="comboBoxInput"] input');
    for (const value of values) {
      await input.fill(value);
      await input.press('Enter');
    }
  }

  /** The "index field" combo boxes of all mapping rows. */
  public get indexFieldInputs(): Locator {
    return this.page.testSubj.locator('entryItemFieldInputFormRow').locator('input');
  }

  /** The "indicator index field" combo boxes of all mapping rows. */
  public get indicatorFieldInputs(): Locator {
    return this.page.testSubj.locator('threatFieldInputFormRow').locator('input');
  }

  /**
   * Fills the mapping row at the given 1-based position, waiting for it to be rendered.
   * When `select` is false for a column the typed value is left as free text instead of
   * picking the suggestion, which produces an invalid mapping.
   */
  async fillMappingRow({
    row = 1,
    indexField,
    indicatorField,
    selectIndexField = true,
    selectIndicatorField = true,
  }: {
    row?: number;
    indexField: string;
    indicatorField: string;
    selectIndexField?: boolean;
    selectIndicatorField?: boolean;
  }): Promise<void> {
    await this.fillComboBox(
      await this.getRowInput(this.indexFieldInputs, row),
      indexField,
      selectIndexField
    );
    await this.fillComboBox(
      await this.getRowInput(this.indicatorFieldInputs, row),
      indicatorField,
      selectIndicatorField
    );
  }

  private async getRowInput(inputs: Locator, row: number): Promise<Locator> {
    await expect.poll(() => inputs.count()).toBeGreaterThanOrEqual(row);
    return (await inputs.all())[row - 1];
  }

  private async fillComboBox(input: Locator, value: string, select: boolean): Promise<void> {
    // fill() waits for the input to be enabled, which happens once the field list has loaded
    await input.fill(value);
    if (select) {
      await this.page.testSubj.locator(`filterFieldOption-${value}`).click();
    }
  }

  async addAndRow(): Promise<void> {
    await this.andButton.click();
  }

  async addOrRow(): Promise<void> {
    await this.orButton.click();
  }

  async continueFromDefineStep(): Promise<void> {
    await this.defineContinueButton.click();
  }

  /** Removes every pill of the source index patterns field. */
  async clearRuleIndexPatterns(): Promise<void> {
    await this.page.testSubj
      .locator('detectionEngineStepDefineRuleIndices')
      .locator('[data-test-subj="comboBoxClearButton"]')
      .click();
  }

  /** Removes every pill of the indicator index patterns field. */
  async clearIndicatorIndexPatterns(): Promise<void> {
    await this.page.testSubj
      .locator('ruleThreatMatchIndicesField')
      .locator('[data-test-subj="comboBoxClearButton"]')
      .click();
  }

  /** Empties a query bar input, which has no clear button. */
  async clearQuery(input: Locator): Promise<void> {
    await input.click();
    await input.press('ControlOrMeta+a');
    await input.press('Delete');
  }

  /** Replaces the text of a query bar input. QueryStringInput ignores fill(), so keys are typed. */
  async setQuery(input: Locator, query: string): Promise<void> {
    await this.clearQuery(input);
    await input.pressSequentially(query);
  }
}
