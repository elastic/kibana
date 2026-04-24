/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { BIGGER_TIMEOUT, CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS, SHORTER_TIMEOUT } from '../constants';

/**
 * Observability-owned rules page helpers. After the rules/rule-details scout specs were
 * relocated to the triggers_actions_ui plugin, this page object only covers the
 * `custom_threshold_rule` specs and the `alert_details_page` rule-details navigation hop.
 */
export class RulesPage {
  constructor(private readonly page: ScoutPage) {}

  /**
   * Navigate to the unified rules list page, or to the rule details page when `ruleId` is
   * provided.
   */
  async goto(ruleId: string = '') {
    await this.page.gotoApp(ruleId ? `rules/rule/${ruleId}` : 'rules');
  }

  // ---- Rule type modal (create rule) --------------------------------------

  public get createRuleButton() {
    return this.page.testSubj.locator('createRuleButton');
  }

  public get ruleTypeModal() {
    return this.page.testSubj.locator('ruleTypeModal');
  }

  async openRuleTypeModal() {
    await expect(this.createRuleButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.createRuleButton.click();
    await expect(this.ruleTypeModal).toBeVisible();
  }

  public get observabilityCategory() {
    return this.ruleTypeModal.locator('.euiFacetButton[title="Observability"]');
  }

  public get customThresholdRuleTypeCard() {
    return this.page.testSubj.locator(
      CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CUSTOM_THRESHOLD_RULE_TYPE_CARD
    );
  }

  async clickCustomThresholdRuleType() {
    await expect(this.customThresholdRuleTypeCard).toBeVisible({ timeout: BIGGER_TIMEOUT });
    await this.customThresholdRuleTypeCard.click();
    await expect(this.ruleForm).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  // ---- Custom threshold rule form -----------------------------------------

  public get ruleForm() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_FORM);
  }

  public get ruleNameInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_NAME_INPUT);
  }

  async setRuleName(name: string) {
    await expect(this.ruleNameInput).toBeVisible();
    await this.ruleNameInput.fill('');
    await this.ruleNameInput.fill(name);
  }

  public get dataViewExpression() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.DATA_VIEW_EXPRESSION);
  }

  public get indexPatternInput() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.INDEX_PATTERN_INPUT);
  }

  public get exploreMatchingIndicesButton() {
    return this.page.testSubj.locator(
      CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.EXPLORE_MATCHING_INDICES_BUTTON
    );
  }

  async setIndexPatternAndWaitForButton(pattern: string) {
    await this.dataViewExpression.click();
    await expect(this.indexPatternInput).toBeVisible();
    await this.indexPatternInput.fill(pattern);
    await expect(this.exploreMatchingIndicesButton).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  async clickExploreMatchingIndices() {
    await this.exploreMatchingIndicesButton.click();
    await expect(this.dataViewExpression).toContainText('.alerts-*', { timeout: SHORTER_TIMEOUT });
  }

  public get ruleSaveButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.RULE_SAVE_BUTTON);
  }

  public get confirmModalButton() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.CONFIRM_MODAL_BUTTON);
  }

  /**
   * The rule-details title element (`ruleDetailsTitle`) that the unified rule details page
   * renders after a successful save.
   */
  public get ruleDetails() {
    return this.page.testSubj.locator('ruleDetailsTitle');
  }

  async waitForFormReady() {
    await expect(this.ruleSaveButton).toBeEnabled({ timeout: SHORTER_TIMEOUT });
  }

  async saveRule() {
    // The rule preview chart polls continuously, alternating between a loading overlay
    // (kbnMountWrapper) and a danger toast. Both intercept pointer events on the footer save
    // button, so focus + keyboard bypasses the pointer-event interception entirely.
    await this.ruleSaveButton.focus();
    await this.page.keyboard.press('Enter');

    await expect(this.confirmModalButton).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.confirmModalButton.click();
    await expect(this.ruleDetails).toBeVisible({ timeout: BIGGER_TIMEOUT });
  }

  // ---- KQL filter / metric row --------------------------------------------

  public get aggregationExpressionA() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.AGGREGATION_NAME_A);
  }

  public get aggregationTypeSelect() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.AGGREGATION_TYPE_SELECT);
  }

  public get kqlSearchField() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.KQL_SEARCH_FIELD);
  }

  public get kqlSuggestionsPanel() {
    return this.page.testSubj.locator(CUSTOM_THRESHOLD_RULE_TEST_SUBJECTS.KQL_SUGGESTIONS_PANEL);
  }

  async openMetricRowPopover() {
    await expect(this.aggregationExpressionA).toBeVisible({ timeout: SHORTER_TIMEOUT });
    await this.aggregationExpressionA.click();
    await expect(this.aggregationTypeSelect).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  async selectCountAggregation() {
    await this.aggregationTypeSelect.selectOption('count');
    await expect(this.kqlSearchField).toBeVisible({ timeout: SHORTER_TIMEOUT });
  }

  async typeInKqlFilter(text: string) {
    await this.kqlSearchField.click();
    await this.kqlSearchField.fill(text);
  }
}
