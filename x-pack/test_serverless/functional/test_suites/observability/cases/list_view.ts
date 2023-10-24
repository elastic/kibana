/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import { SeverityAll } from '@kbn/cases-plugin/common/ui';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlObltNavigation = getService('svlObltNavigation');

  describe('Cases list', function () {
    before(async () => {
      await svlCommonPage.login();
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
      await cases.casesTable.waitForCasesToBeDeleted();
      await svlCommonPage.forceLogout();
    });

    describe('empty state', () => {
      it('displays an empty list with an add button correctly', async () => {
        await testSubjects.existOrFail('cases-table-add-case');
      });
    });

    describe('listing', () => {
      createNCasesBeforeDeleteAllAfter(2, getPageObject, getService);

      it('lists cases correctly', async () => {
        await cases.casesTable.validateCasesTableHasNthRows(2);
      });
    });

    describe('bulk actions', () => {
      describe('delete', () => {
        createNCasesBeforeDeleteAllAfter(8, getPageObject, getService);

        it('bulk delete cases from the list', async () => {
          await cases.casesTable.selectAndDeleteAllCases();
          await cases.casesTable.waitForTableToFinishLoading();
          await cases.casesTable.validateCasesTableHasNthRows(0);
        });
      });

      describe('status', () => {
        createNCasesBeforeDeleteAllAfter(2, getPageObject, getService);

        it('change the status of cases to in-progress correctly', async () => {
          await cases.casesTable.selectAndChangeStatusOfAllCases(CaseStatuses['in-progress']);
          await cases.casesTable.waitForTableToFinishLoading();
          await testSubjects.missingOrFail('case-status-badge-open');
        });
      });

      describe('severity', () => {
        createNCasesBeforeDeleteAllAfter(2, getPageObject, getService);

        it('change the severity of cases to medium correctly', async () => {
          await cases.casesTable.selectAndChangeSeverityOfAllCases(CaseSeverity.MEDIUM);
          await cases.casesTable.waitForTableToFinishLoading();
          await testSubjects.missingOrFail('case-table-column-severity-low');
        });
      });

      describe('tags', () => {
        let caseIds: string[] = [];
        beforeEach(async () => {
          caseIds = [];
          const case1 = await cases.api.createCase({
            title: 'case 1',
            tags: ['one', 'three'],
            owner: 'observability',
          });
          const case2 = await cases.api.createCase({
            title: 'case 2',
            tags: ['two', 'four'],
            owner: 'observability',
          });
          const case3 = await cases.api.createCase({
            title: 'case 3',
            tags: ['two', 'five'],
            owner: 'observability',
          });

          caseIds.push(case1.id);
          caseIds.push(case2.id);
          caseIds.push(case3.id);

          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        afterEach(async () => {
          await svlCases.api.deleteAllCaseItems();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('bulk edit tags', async () => {
          /**
           * Case 3 tags: two, five
           * Case 2 tags: two, four
           * Case 1 tags: one, three
           * All tags: one, two, three, four, five.
           *
           * It selects Case 3 and Case 2 because the table orders
           * the cases in descending order by creation date and clicks
           * the one, three, and five tags
           */
          await cases.casesTable.bulkEditTags([0, 1], ['two', 'three', 'five']);
          await header.waitUntilLoadingHasFinished();
          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.tags).eql(['five', 'three']);
          expect(case2.tags).eql(['four', 'five', 'three']);
          expect(case1.tags).eql(['one', 'three']);
        });

        it('adds a new tag', async () => {
          await cases.casesTable.bulkAddNewTag([0, 1], 'tw');
          await header.waitUntilLoadingHasFinished();

          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.tags).eql(['two', 'five', 'tw']);
          expect(case2.tags).eql(['two', 'four', 'tw']);
          expect(case1.tags).eql(['one', 'three']);
        });
      });
    });

    describe('severity filtering', () => {
      before(async () => {
        await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });

        await cases.api.createCase({ severity: CaseSeverity.LOW, owner: 'observability' });
        await cases.api.createCase({ severity: CaseSeverity.LOW, owner: 'observability' });
        await cases.api.createCase({ severity: CaseSeverity.HIGH, owner: 'observability' });
        await cases.api.createCase({ severity: CaseSeverity.HIGH, owner: 'observability' });
        await cases.api.createCase({ severity: CaseSeverity.CRITICAL, owner: 'observability' });
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      beforeEach(async () => {
        /**
         * There is no easy way to clear the filtering.
         * Refreshing the page seems to be easier.
         */
        await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
      });

      after(async () => {
        await svlCases.api.deleteAllCaseItems();
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
      createNCasesBeforeDeleteAllAfter(12, getPageObject, getService);

      it('paginates cases correctly', async () => {
        await testSubjects.click('tablePaginationPopoverButton');
        await testSubjects.click('tablePagination-25-rows');
        await testSubjects.missingOrFail('pagination-button-1');
        await testSubjects.click('tablePaginationPopoverButton');
        await testSubjects.click('tablePagination-10-rows');
        await testSubjects.isEnabled('pagination-button-1');
        await testSubjects.click('pagination-button-1');
        await testSubjects.isEnabled('pagination-button-0');
      });
    });

    describe('row actions', () => {
      describe('Status', () => {
        createNCasesBeforeDeleteAllAfter(1, getPageObject, getService);

        it('to in progress', async () => {
          await cases.casesTable.changeStatus(CaseStatuses['in-progress'], 0);
          await testSubjects.existOrFail(`case-status-badge-${CaseStatuses['in-progress']}`);
        });

        it('to closed', async () => {
          await cases.casesTable.changeStatus(CaseStatuses.closed, 0);
          await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
        });

        it('to open', async () => {
          await cases.casesTable.changeStatus(CaseStatuses.open, 0);
          await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.open}`);
        });
      });

      describe('Severity', () => {
        createNCasesBeforeDeleteAllAfter(1, getPageObject, getService);

        it('to medium', async () => {
          await cases.casesTable.changeSeverity(CaseSeverity.MEDIUM, 0);
          await testSubjects.existOrFail(`case-table-column-severity-${CaseSeverity.MEDIUM}`);
        });

        it('to high', async () => {
          await cases.casesTable.changeSeverity(CaseSeverity.HIGH, 0);
          await testSubjects.existOrFail(`case-table-column-severity-${CaseSeverity.HIGH}`);
        });

        it('to critical', async () => {
          await cases.casesTable.changeSeverity(CaseSeverity.CRITICAL, 0);
          await testSubjects.existOrFail(`case-table-column-severity-${CaseSeverity.CRITICAL}`);
        });

        it('to low', async () => {
          await cases.casesTable.changeSeverity(CaseSeverity.LOW, 0);
          await testSubjects.existOrFail(`case-table-column-severity-${CaseSeverity.LOW}`);
        });
      });

      describe('Delete', () => {
        createNCasesBeforeDeleteAllAfter(1, getPageObject, getService);

        it('deletes a case correctly', async () => {
          await cases.casesTable.deleteCase(0);
          await cases.casesTable.waitForTableToFinishLoading();
          await cases.casesTable.validateCasesTableHasNthRows(0);
        });
      });
    });
  });
};

const createNCasesBeforeDeleteAllAfter = (
  numCasesToCreate: number,
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService']
) => {
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const header = getPageObject('header');

  before(async () => {
    await cases.api.createNthRandomCases(numCasesToCreate, 'observability');
    await header.waitUntilLoadingHasFinished();
    await cases.casesTable.waitForCasesToBeListed();
  });

  after(async () => {
    await svlCases.api.deleteAllCaseItems();
    await cases.casesTable.waitForCasesToBeDeleted();
  });
};
