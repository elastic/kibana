/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';

/**
 * Rule creation flow for Indicator match (threat match) rules — threat index
 * and threat-field mapping controls.
 */
export class ThreatMatchRuleCreatePage {
  private threatFieldComboBox: Locator | null = null;

  constructor(private readonly page: ScoutPage) {}

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

    await this.page.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
    await this.page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));

    await this.page.testSubj.waitForSelector('threatMatchRuleType', {
      state: 'visible',
      timeout: 30_000,
    });
    await this.page.testSubj.click('threatMatchRuleType');

    const threatIndexField = this.page.testSubj.locator('ruleThreatMatchIndicesField');
    await threatIndexField.locator('input').fill(testIndex);
    await this.page.keyboard.press('Enter');

    const threatFieldRow = this.page.testSubj.locator('threatFieldInputFormRow');
    this.threatFieldComboBox = threatFieldRow.locator(
      '[data-test-subj="fieldAutocompleteComboBox"]'
    );
    await this.threatFieldComboBox.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Focuses the threat-field combobox, types a field name, and returns the
   * matching EUI combobox option locator for assertions.
   */
  async openThreatFieldDropdownOption(fieldName: string): Promise<Locator> {
    if (!this.threatFieldComboBox) {
      throw new Error('Call navigateToThreatMatchForm before openThreatFieldDropdownOption');
    }

    await this.threatFieldComboBox.locator('input').click();
    await this.threatFieldComboBox.locator('input').fill(fieldName);

    return this.page.getByRole('option', { name: fieldName });
  }
}
