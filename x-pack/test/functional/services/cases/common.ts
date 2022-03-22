/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesCommonServiceProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const header = getPageObject('header');
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
    async createCaseFromCreateCasePage(caseTitle: string = 'test-' + uuid.v4()) {
      await this.openCreateCasePage();

      // case name
      await testSubjects.setValue('input', caseTitle);

      // case tag
      await comboBox.setCustom('comboBoxInput', 'tagme');

      // case description
      const descriptionArea = await find.byCssSelector('textarea.euiMarkdownEditorTextArea');
      await descriptionArea.focus();
      await descriptionArea.type('Test description');

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

    /**
     * Marks a case in progress via the status dropdown
     */
    async markCaseInProgressViaDropdown() {
      await this.openCaseSetStatusDropdown();

      await testSubjects.click('case-view-status-dropdown-in-progress');

      // wait for backend response
      await testSubjects.existOrFail('header-page-supplements > status-badge-in-progress', {
        timeout: 5000,
      });
    },

    /**
     * Marks a case closed via the status dropdown
     */
    async markCaseClosedViaDropdown() {
      this.openCaseSetStatusDropdown();

      await testSubjects.click('case-view-status-dropdown-closed');

      // wait for backend response
      await testSubjects.existOrFail('header-page-supplements > status-badge-closed', {
        timeout: 5000,
      });
    },

    /**
     * Marks a case open via the status dropdown
     */
    async markCaseOpenViaDropdown() {
      this.openCaseSetStatusDropdown();

      await testSubjects.click('case-view-status-dropdown-open');

      // wait for backend response
      await testSubjects.existOrFail('header-page-supplements > status-badge-open', {
        timeout: 5000,
      });
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
  };
}
