/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common';
import { CaseSeverity } from '@kbn/cases-plugin/common/api';
import { SeverityAll } from '@kbn/cases-plugin/common/ui';
import { FtrProviderContext } from '../../ftr_provider_context';

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
      await cases.casesTable.waitForCasesToBeDeleted();
    });

    describe('empty state', () => {
      it('displays an empty list with an add button correctly', async () => {
        await testSubjects.existOrFail('cases-table-add-case');
      });
    });

    describe('listing', () => {
      before(async () => {
        await cases.api.createNthRandomCases(2);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('lists cases correctly', async () => {
        await cases.casesTable.validateCasesTableHasNthRows(2);
      });
    });

    describe('deleting', () => {
      before(async () => {
        await cases.api.createNthRandomCases(8);
        await cases.api.createCase({ title: 'delete me', tags: ['one'] });
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('deletes a case correctly from the list', async () => {
        await cases.casesTable.deleteFirstListedCase();
        await cases.casesTable.waitForTableToFinishLoading();

        await retry.tryForTime(2000, async () => {
          const firstRow = await testSubjects.find('case-details-link');
          expect(await firstRow.getVisibleText()).not.to.be('delete me');
        });
      });

      it('bulk delete cases from the list', async () => {
        await cases.casesTable.selectAndDeleteAllCases();
        await cases.casesTable.waitForTableToFinishLoading();
        await cases.casesTable.validateCasesTableHasNthRows(0);
      });
    });

    describe('filtering', () => {
      const caseTitle = 'matchme';

      before(async () => {
        await cases.api.createCase({
          title: caseTitle,
          tags: ['one'],
          description: 'lots of information about an incident',
        });
        await cases.api.createCase({ title: 'test2', tags: ['two'] });
        await cases.api.createCase({ title: 'test3' });
        await cases.api.createCase({ title: 'test4' });
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      beforeEach(async () => {
        /**
         * There is no easy way to clear the filtering.
         * Refreshing the page seems to be easier.
         */
        await cases.navigation.navigateToApp();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('filters cases from the list using a full string match', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        // search
        const input = await testSubjects.find('search-cases');
        await input.type(caseTitle);
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases with a wildcard query "test*" matching the title', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('test*');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(3);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('does not search the owner field', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('cases');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(0);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases by matching the word "information" from the cases description', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('information');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases with a wildcard query "informa*" matching the cases description', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('informa*');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('filters cases by tags', async () => {
        await cases.casesTable.filterByTag('one');
        await cases.casesTable.refreshTable();
        await cases.casesTable.validateCasesTableHasNthRows(1);
        const row = await cases.casesTable.getCaseFromTable(0);
        const tags = await row.findByCssSelector('[data-test-subj="case-table-column-tags-one"]');
        expect(await tags.getVisibleText()).to.be('one');
      });

      it('filters cases by status', async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
        await cases.casesTable.filterByStatus(CaseStatuses['in-progress']);
        await cases.casesTable.validateCasesTableHasNthRows(1);
      });

      /**
       * TODO: Improve the test by creating a case from a
       * different user and filter by the new user
       * and not the default one
       */
      it('filters cases by reporter', async () => {
        await cases.casesTable.filterByReporter('elastic');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });
    });

    describe('severity filtering', () => {
      before(async () => {
        await cases.api.createCase({ severity: CaseSeverity.LOW });
        await cases.api.createCase({ severity: CaseSeverity.LOW });
        await cases.api.createCase({ severity: CaseSeverity.HIGH });
        await cases.api.createCase({ severity: CaseSeverity.HIGH });
        await cases.api.createCase({ severity: CaseSeverity.CRITICAL });
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });
      beforeEach(async () => {
        /**
         * There is no easy way to clear the filtering.
         * Refreshing the page seems to be easier.
         */
        await cases.navigation.navigateToApp();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('filters cases by severity', async () => {
        // by default filter by all
        await cases.casesTable.validateCasesTableHasNthRows(5);

        // low
        await cases.casesTable.filterBySeverity(CaseSeverity.LOW);
        await cases.casesTable.validateCasesTableHasNthRows(2);

        // high
        await cases.casesTable.filterBySeverity(CaseSeverity.HIGH);
        await cases.casesTable.validateCasesTableHasNthRows(2);

        // critical
        await cases.casesTable.filterBySeverity(CaseSeverity.CRITICAL);
        await cases.casesTable.validateCasesTableHasNthRows(1);

        // back to all
        await cases.casesTable.filterBySeverity(SeverityAll);
        await cases.casesTable.validateCasesTableHasNthRows(5);
      });
    });

    describe('pagination', () => {
      before(async () => {
        await cases.api.createNthRandomCases(8);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
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
      before(async () => {
        await cases.api.createNthRandomCases(1);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

      it('to in progress', async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
      });

      it('to closed', async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.closed);
      });

      it('to open', async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.open);
      });
    });
  });
};
