/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const casesApp = getService('casesApp');

  describe('cases list', () => {
    before(async () => {
      await common.navigateToApp('casesStackManagement');
      await casesApp.deleteAllCasesFromList();
    });

    beforeEach(async () => {
      await common.navigateToApp('casesStackManagement');
    });

    it('displays an empty list with an add button correctly', async () => {
      await testSubjects.existOrFail('cases-table-add-case');
    });

    it('lists cases correctly', async () => {
      const NUMBER_CASES = 2;
      // create two cases
      for (let i = 0; i < NUMBER_CASES; i++) {
        await common.navigateToApp('casesStackManagement');
        await casesApp.createCaseFromCreateCasePage();
      }
      await common.navigateToApp('casesStackManagement');
      const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"');
      expect(rows.length).equal(NUMBER_CASES);
    });

    it('deletes a case correctly from the list', async () => {
      await casesApp.createCaseFromCreateCasePage();
      await common.navigateToApp('casesStackManagement');
      await testSubjects.click('action-delete');
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.existOrFail('euiToastHeader');
    });

    describe('changes status from the list', () => {
      before(async () => {
        await common.navigateToApp('casesStackManagement');
        await casesApp.deleteAllCasesFromList();
        await casesApp.createCaseFromCreateCasePage();
        await common.navigateToApp('casesStackManagement');
      });

      it('to in progress', async () => {
        const button = await find.byCssSelector(
          '[data-test-subj="case-view-status-dropdown"] button'
        );
        await button.click();
        await testSubjects.click('case-view-status-dropdown-in-progress');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('status-badge-in-progress');
      });

      it('to closed', async () => {
        const button = await find.byCssSelector(
          '[data-test-subj="case-view-status-dropdown"] button'
        );
        await button.click();
        await testSubjects.click('case-view-status-dropdown-closed');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('status-badge-closed');
      });

      it('to open', async () => {
        const button = await find.byCssSelector(
          '[data-test-subj="case-view-status-dropdown"] button'
        );
        await button.click();
        await testSubjects.click('case-view-status-dropdown-open');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('status-badge-open');
      });
    });
  });
};
