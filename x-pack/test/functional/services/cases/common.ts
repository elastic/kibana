/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { CaseStatuses } from '@kbn/cases-plugin/common';
import { CaseSeverity } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../ftr_provider_context';

export type CasesCommon = ProvidedType<typeof CasesCommonServiceProvider>;

export function CasesCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const header = getPageObject('header');
  const common = getPageObject('common');
  const toasts = getService('toasts');
  const retry = getService('retry');

  return {
    /**
     * Opens the create case page pressing the "create case" button.
     *
     * Doesn't do navigation. Only works if you are already inside a cases app page.
     * Does not work with the cases flyout.
     */
    async openCreateCasePage() {
      await testSubjects.click('createNewCaseBtn');
      await testSubjects.existOrFail('create-case-submit', {
        timeout: 5000,
      });
    },

    async changeCaseStatusViaDropdownAndVerify(status: CaseStatuses) {
      this.openCaseSetStatusDropdown();
      await testSubjects.click(`case-view-status-dropdown-${status}`);
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail(`status-badge-${status}`);
    },

    async openCaseSetStatusDropdown() {
      const button = await find.byCssSelector(
        '[data-test-subj="case-view-status-dropdown"] button'
      );
      await button.click();
    },

    async assertRadioGroupValue(testSubject: string, expectedValue: string) {
      const assertRadioGroupValue = await testSubjects.find(testSubject);
      const input = await assertRadioGroupValue.findByCssSelector(':checked');
      const selectedOptionId = await input.getAttribute('id');
      expect(selectedOptionId).to.eql(
        expectedValue,
        `Expected the radio group value to equal "${expectedValue}" (got "${selectedOptionId}")`
      );
    },

    async selectRadioGroupValue(testSubject: string, value: string) {
      const radioGroup = await testSubjects.find(testSubject);
      const label = await radioGroup.findByCssSelector(`label[for="${value}"]`);
      await label.click();
      await this.assertRadioGroupValue(testSubject, value);
    },

    async selectSeverity(severity: CaseSeverity) {
      await common.clickAndValidate(
        'case-severity-selection',
        `case-severity-selection-${severity}`
      );
      await testSubjects.click(`case-severity-selection-${severity}`);
    },

    async expectToasterToContain(content: string) {
      const toast = await toasts.getToastElement(1);
      expect(await toast.getVisibleText()).to.contain(content);
      await toasts.dismissAllToasts();
    },

    async assertCaseModalVisible(expectVisible = true) {
      await retry.tryForTime(5000, async () => {
        if (expectVisible) {
          await testSubjects.existOrFail('all-cases-modal');
        } else {
          await testSubjects.missingOrFail('all-cases-modal');
        }
      });
    },

    async setSearchTextInAssigneesPopover(text: string) {
      await (
        await (await find.byClassName('euiContextMenuPanel')).findByClassName('euiFieldSearch')
      ).type(text);
      await header.waitUntilLoadingHasFinished();
    },

    async selectFirstRowInAssigneesPopover() {
      await (await find.byClassName('euiSelectableListItem__content')).click();
      await header.waitUntilLoadingHasFinished();
    },
  };
}
