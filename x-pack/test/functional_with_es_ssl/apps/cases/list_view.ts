/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const retry = getService('retry');
  const browser = getService('browser');

  describe('cases list', () => {
    before(async () => {
      await common.navigateToApp('cases');
      await cases.api.deleteAllCases();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    beforeEach(async () => {
      await common.navigateToApp('cases');
    });

    it('displays an empty list with an add button correctly', async () => {
      await testSubjects.existOrFail('cases-table-add-case');
    });

    it('lists cases correctly', async () => {
      const NUMBER_CASES = 2;
      await cases.api.createNthRandomCases(NUMBER_CASES);
      await common.navigateToApp('cases');
      await cases.common.validateCasesTableHasNthRows(NUMBER_CASES);
    });

    it('deletes a case correctly from the list', async () => {
      await cases.api.createNthRandomCases(1);
      await common.navigateToApp('cases');
      await testSubjects.click('action-delete');
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.existOrFail('euiToastHeader');
    });

    it('filters cases from the list with partial match', async () => {
      await cases.api.createNthRandomCases(5);
      const id = uuid.v4();
      const caseTitle = 'test-' + id;
      await cases.api.createCaseWithData({ title: caseTitle });
      await common.navigateToApp('cases');

      // search
      const input = await testSubjects.find('search-cases');
      await input.type(caseTitle);
      await input.pressKeys(browser.keys.ENTER);

      await retry.tryForTime(20000, async () => {
        await cases.common.validateCasesTableHasNthRows(1);
      });
    });

    it('paginates cases correctly', async () => {
      await cases.api.deleteAllCases();
      await cases.api.createNthRandomCases(8);
      await common.navigateToApp('cases');
      await testSubjects.click('tablePaginationPopoverButton');
      await testSubjects.click('tablePagination-5-rows');
      await testSubjects.isEnabled('pagination-button-1');
      await testSubjects.click('pagination-button-1');
      await testSubjects.isEnabled('pagination-button-0');
    });

    it('bulk delete cases from the list', async () => {
      // deletes them from the API
      await cases.api.deleteAllCases();
      await cases.api.createNthRandomCases(8);
      await common.navigateToApp('cases');
      // deletes them from the UI
      await cases.common.selectAndDeleteAllCases();
      await cases.common.validateCasesTableHasNthRows(0);
    });

    describe('changes status from the list', () => {
      before(async () => {
        await common.navigateToApp('cases');
        await cases.api.deleteAllCases();
        await cases.api.createNthRandomCases(1);
        await common.navigateToApp('cases');
      });

      it('to in progress', async () => {
        await cases.common.openCaseSetStatusDropdown();
        await testSubjects.click('case-view-status-dropdown-in-progress');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('status-badge-in-progress');
      });

      it('to closed', async () => {
        await cases.common.openCaseSetStatusDropdown();
        await testSubjects.click('case-view-status-dropdown-closed');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('status-badge-closed');
      });

      it('to open', async () => {
        await cases.common.openCaseSetStatusDropdown();
        await testSubjects.click('case-view-status-dropdown-open');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('status-badge-open');
      });
    });
  });
};
