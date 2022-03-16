/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export function CasesAppServiceProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
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
    async createCaseFromCreateCasePage(caseTitle: string = 'test' + uuid.v4()) {
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
      testSubjects.click('create-case-submit');

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
      const button = await find.byCssSelector(
        '[data-test-subj="case-view-status-dropdown"] button'
      );
      button.click();

      await testSubjects.click('case-view-status-dropdown-in-progress');

      // wait for backend response
      await retry.tryForTime(5000, () =>
        find.byCssSelector(
          '[data-test-subj="header-page-supplements"] [data-test-subj="status-badge-in-progress"]'
        )
      );
    },

    /**
     * Marks a case closed via the status dropdown
     */
    async markCaseClosedViaDropdown() {
      const button = await find.byCssSelector(
        '[data-test-subj="case-view-status-dropdown"] button'
      );
      button.click();

      await testSubjects.click('case-view-status-dropdown-closed');

      // wait for backend response
      await retry.tryForTime(5000, () =>
        find.byCssSelector(
          '[data-test-subj="header-page-supplements"] [data-test-subj="status-badge-closed"]'
        )
      );
    },

    /**
     * Marks a case open via the status dropdown
     */
    async markCaseOpenViaDropdown() {
      const button = await find.byCssSelector(
        '[data-test-subj="case-view-status-dropdown"] button'
      );
      button.click();

      await testSubjects.click('case-view-status-dropdown-open');

      // wait for backend response
      await retry.tryForTime(5000, () =>
        find.byCssSelector(
          '[data-test-subj="header-page-supplements"] [data-test-subj="status-badge-open"]'
        )
      );
    },
  };
}
