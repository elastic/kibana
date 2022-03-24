/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';
import { CaseStatuses } from '../../../../plugins/cases/common';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const retry = getService('retry');
  const browser = getService('browser');

  describe('cases list', () => {
    before(async () => {
      await cases.navigation.navigateToApp();
    });

    after(async () => {
      await cases.api.deleteAllCases();
    });

    describe('empty state', () => {
      it('displays an empty list with an add button correctly', async () => {
        await testSubjects.existOrFail('cases-table-add-case');
      });
    });

    describe('listing', () => {
      const NUMBER_CASES = 2;

      before(async () => {
        await cases.api.createNthRandomCases(NUMBER_CASES);
        await header.waitUntilLoadingHasFinished();
        await cases.common.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('lists cases correctly', async () => {
        await cases.common.validateCasesTableHasNthRows(NUMBER_CASES);
      });
    });

    describe('deleting', () => {
      const NUMBER_CASES = 9;

      before(async () => {
        await cases.api.createNthRandomCases(NUMBER_CASES);
        await header.waitUntilLoadingHasFinished();
        await cases.common.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('deletes a case correctly from the list', async () => {
        await testSubjects.click('action-delete');
        await testSubjects.click('confirmModalConfirmButton');
        await testSubjects.existOrFail('euiToastHeader');
      });

      it('bulk delete cases from the list', async () => {
        await cases.common.selectAndDeleteAllCases();
        await cases.common.validateCasesTableHasNthRows(0);
      });
    });

    describe('filtering', () => {
      const NUMBER_CASES = 2;
      const id = uuid.v4();
      const caseTitle = 'matchme-' + id;

      before(async () => {
        await cases.api.createNthRandomCases(NUMBER_CASES);
        await cases.api.createCaseWithData({ title: caseTitle, tags: ['one'] });
        await cases.api.createCaseWithData({ tags: ['two'] });
        await header.waitUntilLoadingHasFinished();
        await cases.common.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('filters cases from the list with partial match', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        // search
        const input = await testSubjects.find('search-cases');
        await input.type(caseTitle);
        await input.pressKeys(browser.keys.ENTER);

        await retry.tryForTime(20000, async () => {
          await cases.common.validateCasesTableHasNthRows(1);
        });

        await testSubjects.click('clearSearchButton');
        await cases.common.validateCasesTableHasNthRows(NUMBER_CASES);
      });

      it('filters cases by tags', async () => {
        await cases.common.filterByTag('one');
        await cases.common.refreshTable();
        await cases.common.validateCasesTableHasNthRows(1);
        const row = await cases.common.getCaseFromTable(0);
        const tags = await row.findByCssSelector('[data-test-subj="case-table-column-tags-one"]');
        expect(await tags.getVisibleText()).to.be('one');
      });

      it('filters cases by status', async () => {
        await cases.common.changeCaseStatusAndVerify(CaseStatuses['in-progress']);
        await cases.common.filterByStatus(CaseStatuses['in-progress']);
        await cases.common.validateCasesTableHasNthRows(1);
      });
    });

    describe('pagination', () => {
      const NUMBER_CASES = 8;

      before(async () => {
        await cases.api.createNthRandomCases(NUMBER_CASES);
        await header.waitUntilLoadingHasFinished();
        await cases.common.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('paginates cases correctly', async () => {
        await testSubjects.click('tablePaginationPopoverButton');
        await testSubjects.click('tablePagination-5-rows');
        await testSubjects.isEnabled('pagination-button-1');
        await testSubjects.click('pagination-button-1');
        await testSubjects.isEnabled('pagination-button-0');
      });
    });

    describe('changes status from the list', () => {
      const NUMBER_CASES = 1;

      before(async () => {
        await cases.api.createNthRandomCases(NUMBER_CASES);
        await header.waitUntilLoadingHasFinished();
        await cases.common.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('to in progress', async () => {
        await cases.common.changeCaseStatusAndVerify(CaseStatuses['in-progress']);
      });

      it('to closed', async () => {
        await cases.common.changeCaseStatusAndVerify(CaseStatuses.closed);
      });

      it('to open', async () => {
        await cases.common.changeCaseStatusAndVerify(CaseStatuses.open);
      });
    });
  });
};
