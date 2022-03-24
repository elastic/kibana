/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import uuid from 'uuid';
import { CaseStatuses } from '../../../../plugins/cases/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const header = getPageObject('header');
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

    /**
     * it creates a new case from the create case page
     * and leaves the navigation in the case view page
     *
     * Doesn't do navigation. Only works if you are already inside a cases app page.
     * Does not work with the cases flyout.
     */
    async createCaseFromCreateCasePage({
      title = 'test-' + uuid.v4(),
      description = 'desc' + uuid.v4(),
      tag = 'tagme',
    }: {
      title: string;
      description: string;
      tag: string;
    }) {
      await this.openCreateCasePage();

      // case name
      await testSubjects.setValue('input', title);

      // case tag
      await comboBox.setCustom('comboBoxInput', tag);

      // case description
      const descriptionArea = await find.byCssSelector('textarea.euiMarkdownEditorTextArea');
      await descriptionArea.focus();
      await descriptionArea.type(description);

      // save
      await testSubjects.click('create-case-submit');

      await testSubjects.existOrFail('case-view-title');
    },

    /**
     * Goes to the first case listed on the table.
     *
     * This will fail if the table doesn't have any case
     */
    async goToFirstListedCase() {
      await testSubjects.existOrFail('cases-table');
      await testSubjects.click('case-details-link');
      await testSubjects.existOrFail('case-view-title');
    },

    async changeCaseStatusAndVerify(status: CaseStatuses) {
      this.openCaseSetStatusDropdown();
      await testSubjects.click(`case-view-status-dropdown-${status}`);
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail(`status-badge-${status}`);
    },

    async bulkDeleteAllCases() {
      await testSubjects.setCheckbox('checkboxSelectAll', 'check');
      const button = await find.byCssSelector('[aria-label="Bulk actions"]');
      await button.click();
      await testSubjects.click('cases-bulk-delete-button');
      await testSubjects.click('confirmModalConfirmButton');
    },

    async selectAndDeleteAllCases() {
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('cases-table', { timeout: 20 * 1000 });
      let rows: WebElementWrapper[];
      do {
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });
        rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);
        if (rows.length > 0) {
          await this.bulkDeleteAllCases();
          // wait for a second
          await new Promise((r) => setTimeout(r, 1000));
          await header.waitUntilLoadingHasFinished();
        }
      } while (rows.length > 0);
    },

    async validateCasesTableHasNthRows(nrRows: number) {
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('cases-table', { timeout: 20 * 1000 });
      await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });
      const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);
      expect(rows.length).equal(nrRows);
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

    async waitForCasesToBeListed() {
      await retry.waitFor('cases to appear on the all cases table', async () => {
        this.refreshTable();
        return await testSubjects.exists('case-details-link');
      });
    },

    async getCaseFromTable(index: number) {
      const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);

      if (index > rows.length) {
        throw new Error('Cannot get case from table. Index is greater than the length of all rows');
      }

      return rows[index] ?? null;
    },

    async filterByTag(tag: string) {
      await common.clickAndValidate(
        'options-filter-popover-button-Tags',
        `options-filter-popover-item-${tag}`
      );

      await testSubjects.click(`options-filter-popover-item-${tag}`);
    },

    async filterByStatus(status: CaseStatuses) {
      await common.clickAndValidate('case-status-filter', `status-badge-${status}`);

      await testSubjects.click(`status-badge-${status}`);
    },

    async refreshTable() {
      await testSubjects.click('all-cases-refresh');
    },
  };
}
