/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout';
import { EuiComboBoxWrapper } from '@kbn/scout';

/**
 * Rule creation flow for Indicator match (threat match) rules — threat index
 * and threat-field mapping controls.
 */
export class ThreatMatchRuleCreatePage {
  public readonly threatIndexComboBox: EuiComboBoxWrapper;
  public readonly threatFieldComboBox: EuiComboBoxWrapper;

  constructor(private readonly page: ScoutPage) {
    this.threatIndexComboBox = new EuiComboBoxWrapper(this.page, {
      dataTestSubj: 'ruleThreatMatchIndicesField',
    });
    this.threatFieldComboBox = new EuiComboBoxWrapper(this.page, {
      locator:
        '[data-test-subj="threatFieldInputFormRow"] [data-test-subj="fieldAutocompleteComboBox"]',
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

    await this.page.addInitScript(() => {
      window.localStorage.setItem('cps:projectPicker:tourShown', 'true');
    });
    await this.page.goto(kbnUrl.app('security/rules/create', { space: spaceId }));

    // Rule type cards may take a while to render in CI
    await this.page.testSubj.waitForSelector('threatMatchRuleType', {
      state: 'visible',
      timeout: 30_000,
    });
    await this.page.testSubj.click('threatMatchRuleType');

    await this.threatIndexComboBox.setCustomSingleOption(testIndex);

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
    await this.threatFieldComboBox.clear();

    const searchInput = this.page.testSubj
      .locator('threatFieldInputFormRow')
      .locator('[data-test-subj="comboBoxSearchInput"]');
    await searchInput.click();
    await searchInput.pressSequentially(fieldName, { delay: 50 });

    return this.page.getByRole('option', { name: fieldName });
  }
}
