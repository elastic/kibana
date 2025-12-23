/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import {
  CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS,
  RULE_TYPE_MODAL_TEST_SUBJECTS,
  BIGGER_TIMEOUT,
  SHORTER_TIMEOUT,
} from '../constants';

export class CustomThresholdRulePage {
  constructor(private readonly page: ScoutPage) {}

  // Rule Type Modal Methods

  /**
   * Gets the rule type modal locator
   */
  public get ruleTypeModal() {
    return this.page.testSubj.locator(RULE_TYPE_MODAL_TEST_SUBJECTS.RULE_TYPE_MODAL);
  }

  /**
   * Gets the Observability category button in the rule type modal
   */
  public get observabilityCategoryButton() {
    return this.ruleTypeModal.locator('.euiFacetButton[title="Observability"]');
  }

  /**
   * Gets the Custom Threshold rule option in the rule type modal
   */
  public get customThresholdRuleOption() {
    return this.page.testSubj.locator(
      CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CUSTOM_THRESHOLD_RULE_TYPE_SELECTOR
    );
  }

  /**
   * Clicks on the Observability category in the rule type modal
   */
  async clickObservabilityCategory() {
    await expect(this.ruleTypeModal).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.observabilityCategoryButton.click();
  }

  /**
   * Clicks on Custom Threshold rule type
   */
  async clickCustomThresholdRule() {
    await expect(this.customThresholdRuleOption).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.customThresholdRuleOption.click();
  }

  // Rule Form Methods

  /**
   * Gets the rule name input
   */
  public get ruleNameInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_NAME_INPUT);
  }

  /**
   * Gets the rule tags input (the actual input inside the combobox)
   */
  public get ruleTagsInput() {
    return this.page.testSubj
      .locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_TAGS_INPUT)
      .locator('input');
  }

  /**
   * Gets the save button
   */
  public get saveButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.SAVE_BUTTON);
  }

  /**
   * Gets the confirm modal confirm button
   */
  public get confirmModalButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CONFIRM_MODAL_BUTTON);
  }

  /**
   * Sets the rule name
   */
  async setRuleName(name: string) {
    await this.ruleNameInput.clear();
    await this.ruleNameInput.fill(name);
  }

  /**
   * Adds a tag to the rule
   */
  async addTag(tag: string) {
    await this.ruleTagsInput.fill(tag);
    await this.ruleTagsInput.press('Enter');
  }

  // Data View Selection Methods

  /**
   * Gets the data view expression button
   */
  public get dataViewExpressionButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.DATA_VIEW_EXPRESSION);
  }

  /**
   * Gets the data view input field
   */
  public get dataViewInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.DATA_VIEW_INPUT);
  }

  /**
   * Selects a data view by name
   */
  async selectDataView(dataViewName: string) {
    await this.dataViewExpressionButton.click();
    await this.dataViewInput.fill(dataViewName);
    await this.dataViewInput.press('Enter');
    // Wait for selection to take effect
    await expect(this.dataViewExpressionButton).toContainText(dataViewName, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  // Aggregation Methods

  /**
   * Gets the aggregation name A button
   */
  public get aggregationNameA() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.AGGREGATION_NAME_A);
  }

  /**
   * Gets the aggregation name B button
   */
  public get aggregationNameB() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.AGGREGATION_NAME_B);
  }

  /**
   * Gets the aggregation type select dropdown
   */
  public get aggregationTypeSelect() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.AGGREGATION_TYPE_SELECT);
  }

  /**
   * Gets the aggregation field input
   */
  public get aggregationFieldInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.AGGREGATION_FIELD);
  }

  /**
   * Gets the add aggregation button
   */
  public get addAggregationButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.ADD_AGGREGATION_BUTTON);
  }

  /**
   * Gets the close popover button
   */
  async clickClosePopoverButton() {
    const buttons = this.page.testSubj.locator(
      CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CLOSE_POPOVER_BUTTON
    );
    // Click the last visible button (the most recently opened popover)
    const count = await buttons.count();
    for (let i = count - 1; i >= 0; i--) {
      // eslint-disable-next-line playwright/no-nth-methods
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        return;
      }
    }
  }

  /**
   * Gets the search field for filter/KQL
   */
  public get searchField() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.SEARCH_FIELD);
  }

  /**
   * Selects an aggregation type
   */
  async selectAggregationType(aggType: string) {
    await this.aggregationTypeSelect.click();
    await this.aggregationTypeSelect.selectOption(aggType);
  }

  /**
   * Mapping from aggregation type values to their display labels
   */
  private readonly AGG_TYPE_LABELS: Record<string, string> = {
    avg: 'Average',
    min: 'Min',
    max: 'Max',
    sum: 'Sum',
    count: 'Сount',
    cardinality: 'Cardinality',
    p99: '99th Percentile',
    p95: '95th Percentile',
    rate: 'Rate',
  };

  /**
   * Sets the first aggregation (A)
   */
  async setAggregationA(aggType: string, fieldName?: string) {
    await this.aggregationNameA.click();
    await this.selectAggregationType(aggType);
    if (fieldName) {
      const input = this.aggregationFieldInput.locator('input');
      await input.fill(fieldName);
    }
    await this.clickClosePopoverButton();
    // Wait for update - use the display label for the aggregation type
    const expectedLabel = this.AGG_TYPE_LABELS[aggType] || aggType;
    await expect(this.aggregationNameA).toContainText(expectedLabel, {
      timeout: BIGGER_TIMEOUT,
    });
  }

  /**
   * Adds a second aggregation (B) with optional filter
   */
  async addAggregationB(filter?: string) {
    await this.addAggregationButton.click();
    await this.aggregationNameB.click();
    if (filter) {
      await this.searchField.fill(filter);
    }
    await this.clickClosePopoverButton();
    // Wait for update - default aggregation type is count which displays as "Document count"
    await expect(this.aggregationNameB).toContainText('Count service.name : "opbeans-node"', {
      timeout: BIGGER_TIMEOUT,
    });
  }

  // Custom Equation Methods

  /**
   * Gets the custom equation button
   */
  public get customEquationButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CUSTOM_EQUATION);
  }

  /**
   * Gets the custom equation text field
   */
  public get customEquationTextField() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.EQUATION_TEXT_FIELD);
  }

  /**
   * Gets the equation label input
   */
  public get equationLabelInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.EQUATION_LABEL_INPUT);
  }

  /**
   * Sets a custom equation
   */
  async setCustomEquation(equation: string) {
    await this.customEquationButton.click();
    await this.customEquationTextField.click();
    await this.customEquationTextField.fill(equation);
    await this.clickClosePopoverButton();
    // Wait for update
    await expect(this.customEquationButton).toContainText(equation, { timeout: BIGGER_TIMEOUT });
  }

  /**
   * Sets the equation label
   */
  async setEquationLabel(label: string) {
    await this.equationLabelInput.fill(label);
  }

  // Threshold Methods

  /**
   * Gets the threshold popover button
   */
  public get thresholdPopoverButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.THRESHOLD_POPOVER);
  }

  /**
   * Gets the comparator options select
   */
  public get comparatorSelect() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.COMPARATOR_SELECT);
  }

  /**
   * Gets the threshold input 0
   */
  public get thresholdInput0() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.THRESHOLD_INPUT_0);
  }

  /**
   * Gets the threshold input 1 (for between comparators)
   */
  public get thresholdInput1() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.THRESHOLD_INPUT_1);
  }

  /**
   * Sets threshold with comparator
   */
  async setThreshold(comparator: string, value1: string, value2?: string) {
    await this.thresholdPopoverButton.click();
    await this.comparatorSelect.click();
    await this.comparatorSelect.selectOption(comparator);

    await this.thresholdInput0.click();
    await this.thresholdInput0.clear();
    await this.thresholdInput0.fill(value1);

    if (value2) {
      await this.thresholdInput1.fill(value2);
    }

    // Close the popover by pressing Escape or clicking close button
    await this.page.locator('[aria-label="Close"]').click();
    await expect(this.thresholdPopoverButton).toContainText(value1, { timeout: BIGGER_TIMEOUT });
  }

  // Time Range Methods

  /**
   * Gets the for last expression button
   */
  public get forLastExpressionButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.FOR_LAST_EXPRESSION);
  }

  /**
   * Gets the time window size input
   */
  public get timeWindowSizeInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.TIME_WINDOW_SIZE);
  }

  /**
   * Gets the time window unit select
   */
  public get timeWindowUnitSelect() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.TIME_WINDOW_UNIT);
  }

  /**
   * Sets the time range for the rule
   */
  async setTimeRange(size: string, unit: string) {
    await this.forLastExpressionButton.click();
    await this.timeWindowSizeInput.click();
    await this.timeWindowSizeInput.clear();
    await this.timeWindowSizeInput.fill(size);
    await this.timeWindowUnitSelect.click();
    await this.timeWindowUnitSelect.selectOption(unit);
    await this.page.locator('[aria-label="Close"]').click();
  }

  // Group By Methods

  /**
   * Gets the group by combo box input
   */
  public get groupByInput() {
    return this.page.testSubj
      .locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.GROUP_BY_INPUT)
      .locator('[data-test-subj="comboBoxSearchInput"]');
  }

  /**
   * Sets the group by field
   */
  async setGroupBy(field: string) {
    await this.groupByInput.fill(field);
  }

  // Save Rule Methods

  /**
   * Saves the rule
   */
  async saveRule() {
    await this.saveButton.click();
    await expect(this.confirmModalButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.confirmModalButton.click();
  }

  /**
   * Gets toast messages
   */
  public get toastTitle() {
    return this.page.testSubj.locator('euiToastHeader__title');
  }

  /**
   * Waits for success toast with rule name
   */
  async expectSuccessToast(ruleName: string) {
    await expect(this.toastTitle).toContainText(`${ruleName}`, {
      timeout: BIGGER_TIMEOUT,
    });
  }
}
