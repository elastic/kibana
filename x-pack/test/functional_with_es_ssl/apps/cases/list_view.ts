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
import { UserProfile } from '@kbn/user-profile-components';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../cases_api_integration/common/lib/authentication';
import { users, roles, casesAllUser, casesAllUser2 } from './common';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
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

    describe('bulk actions', () => {
      describe('delete', () => {
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

        it('bulk delete cases from the list', async () => {
          await cases.casesTable.selectAndDeleteAllCases();
          await cases.casesTable.waitForTableToFinishLoading();
          await cases.casesTable.validateCasesTableHasNthRows(0);
        });
      });

      describe('status', () => {
        before(async () => {
          await cases.api.createNthRandomCases(2);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('change the status of cases to in-progress correctly', async () => {
          await cases.casesTable.selectAndChangeStatusOfAllCases(CaseStatuses['in-progress']);
          await cases.casesTable.waitForTableToFinishLoading();
          await testSubjects.missingOrFail('case-status-badge-open');
        });
      });

      describe('severity', () => {
        before(async () => {
          await cases.api.createNthRandomCases(2);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

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
          const case1 = await cases.api.createCase({ title: 'case 1', tags: ['one', 'three'] });
          const case2 = await cases.api.createCase({ title: 'case 2', tags: ['two', 'four'] });
          const case3 = await cases.api.createCase({ title: 'case 3', tags: ['two', 'five'] });

          caseIds.push(case1.id);
          caseIds.push(case2.id);
          caseIds.push(case3.id);

          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        afterEach(async () => {
          await cases.api.deleteAllCases();
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

      describe('assignees', () => {
        let caseIds: string[] = [];
        let profiles: UserProfile[] = [];

        const findAssigneeByUserName = (username: string) =>
          profiles.find((profile) => profile.user.username === username);

        before(async () => {
          await createUsersAndRoles(getService, users, roles);
          await cases.api.activateUserProfiles(users);

          profiles = await cases.api.suggestUserProfiles({
            name: '',
            owners: ['cases'],
          });
        });

        beforeEach(async () => {
          caseIds = [];
          const casesAll = findAssigneeByUserName('cases_all_user')!;
          const casesAll2 = findAssigneeByUserName('cases_all_user2')!;
          const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;

          const case1 = await cases.api.createCase({
            title: 'case 1',
            assignees: [{ uid: casesAll.uid }],
          });

          const case2 = await cases.api.createCase({
            title: 'case 2',
            assignees: [{ uid: casesAll2.uid }, { uid: casesNoDelete.uid }],
          });

          const case3 = await cases.api.createCase({
            title: 'case 3',
            assignees: [{ uid: casesAll2.uid }],
          });

          caseIds.push(case1.id);
          caseIds.push(case2.id);
          caseIds.push(case3.id);

          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        afterEach(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        after(async () => {
          await deleteUsersAndRoles(getService, users, roles);
        });

        it('bulk edit assignees', async () => {
          const casesAll2 = findAssigneeByUserName('cases_all_user2')!;
          const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;
          const casesAll = findAssigneeByUserName('cases_all_user')!;

          /**
           * Case 3 assignees: cases_all_user2
           * Case 2 assignees: cases_all_user2, cases_no_delete_user
           * Case 1 assignees: cases_all_user
           * All assignees: cases_all_user, cases_all_user2, cases_read_delete_user, cases_no_delete_user
           *
           * It selects Case 3 and Case 2 because the table orders
           * the cases in descending order by creation date and clicks
           * the cases_all_user2, cases_no_delete_user
           */

          await cases.casesTable.bulkEditAssignees([0, 1], [casesAll2.uid, casesNoDelete.uid]);

          await header.waitUntilLoadingHasFinished();

          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.assignees).eql([{ uid: casesNoDelete.uid }]);
          expect(case2.assignees).eql([{ uid: casesNoDelete.uid }]);
          expect(case1.assignees).eql([{ uid: casesAll.uid }]);
        });

        it('adds a new assignee', async () => {
          const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;
          const casesAll = findAssigneeByUserName('cases_all_user')!;
          const casesAll2 = findAssigneeByUserName('cases_all_user2')!;

          await cases.casesTable.bulkAddNewAssignees([0, 1], 'cases all_user');
          await header.waitUntilLoadingHasFinished();

          const case1 = await cases.api.getCase({ caseId: caseIds[0] });
          const case2 = await cases.api.getCase({ caseId: caseIds[1] });
          const case3 = await cases.api.getCase({ caseId: caseIds[2] });

          expect(case3.assignees).eql([{ uid: casesAll2.uid }, { uid: casesAll.uid }]);
          expect(case2.assignees).eql([
            { uid: casesAll2.uid },
            { uid: casesNoDelete.uid },
            { uid: casesAll.uid },
          ]);
          expect(case1.assignees).eql([{ uid: casesAll.uid }]);
        });
      });
    });

    describe('filtering', () => {
      const caseTitle = 'matchme';
      const caseIds: string[] = [];

      before(async () => {
        await createUsersAndRoles(getService, users, roles);
        await cases.api.activateUserProfiles([casesAllUser, casesAllUser2]);

        const profiles = await cases.api.suggestUserProfiles({ name: 'all', owners: ['cases'] });

        const case1 = await cases.api.createCase({
          title: caseTitle,
          tags: ['one'],
          description: 'lots of information about an incident',
        });
        const case2 = await cases.api.createCase({ title: 'test2', tags: ['two'] });

        await cases.api.createCase({ title: case2.id, assignees: [{ uid: profiles[0].uid }] });
        await cases.api.createCase({
          title: 'test4',
          assignees: [{ uid: profiles[1].uid }],
          description: case2.id,
        });

        caseIds.push(case1.id);
        caseIds.push(case2.id);

        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      beforeEach(async () => {
        /**
         * There is no easy way to clear the filtering.
         * Refreshing the page seems to be easier.
         */
        await browser.clearLocalStorage();
        await cases.navigation.navigateToApp();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
        await deleteUsersAndRoles(getService, users, roles);
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

      it('filters cases from the list using an id search', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type(caseIds[0]);
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(1);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('id search also matches title and description', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type(caseIds[1]);
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(3);
        await testSubjects.click('clearSearchButton');
        await cases.casesTable.validateCasesTableHasNthRows(4);
      });

      it('only shows cases with a wildcard query "test*" matching the title', async () => {
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });

        const input = await testSubjects.find('search-cases');
        await input.type('test*');
        await input.pressKeys(browser.keys.ENTER);

        await cases.casesTable.validateCasesTableHasNthRows(2);
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
        const tags = await row.findByTestSubject('case-table-column-tags-one');
        expect(await tags.getVisibleText()).to.be('one');
      });

      it('filters cases by status', async () => {
        await cases.casesTable.changeStatus(CaseStatuses['in-progress'], 0);
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses['in-progress']}`);
        await cases.casesTable.filterByStatus(CaseStatuses['in-progress']);
        await cases.casesTable.validateCasesTableHasNthRows(1);
      });

      it('persists status filters', async () => {
        await cases.casesTable.changeStatus(CaseStatuses.closed, 0);
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
        await browser.refresh();
        await testSubjects.existOrFail(`case-status-badge-${CaseStatuses.closed}`);
      });

      it('persists severity filters', async () => {
        await cases.casesTable.changeSeverity(CaseSeverity.MEDIUM, 0);
        await testSubjects.existOrFail(`case-table-column-severity-${CaseSeverity.MEDIUM}`);
        await browser.refresh();
        await testSubjects.existOrFail(`case-table-column-severity-${CaseSeverity.MEDIUM}`);
      });

      describe('assignees filtering', () => {
        it('filters cases by the first cases all user assignee', async () => {
          await cases.casesTable.filterByAssignee('all');
          await cases.casesTable.validateCasesTableHasNthRows(1);
          await testSubjects.exists('case-user-profile-avatar-cases_all_user');
        });

        it('filters cases by the casesAllUser2 assignee', async () => {
          await cases.casesTable.filterByAssignee('2');
          await cases.casesTable.validateCasesTableHasNthRows(1);
          await testSubjects.exists('case-user-profile-avatar-cases_all_user2');
        });

        it('filters cases without assignees', async () => {
          await cases.casesTable.openAssigneesPopover();
          await cases.common.selectFirstRowInAssigneesPopover();
          await cases.casesTable.validateCasesTableHasNthRows(2);

          const firstCaseTitle = await (
            await cases.casesTable.getCaseFromTable(0)
          ).findByTestSubject('case-details-link');

          const secondCaseTitle = await (
            await cases.casesTable.getCaseFromTable(1)
          ).findByTestSubject('case-details-link');

          expect(await firstCaseTitle.getVisibleText()).be('test2');
          expect(await secondCaseTitle.getVisibleText()).be('matchme');
        });

        it('filters cases with and without assignees', async () => {
          await cases.casesTable.openAssigneesPopover();
          await cases.common.selectRowsInAssigneesPopover([0, 2]);
          await cases.casesTable.validateCasesTableHasNthRows(3);

          expect(await cases.casesTable.getCaseTitle(0)).be('test4');
          expect(await cases.casesTable.getCaseTitle(1)).be('test2');
          expect(await cases.casesTable.getCaseTitle(2)).be('matchme');
        });
      });
    });

    describe('severity filtering', () => {
      before(async () => {
        await cases.navigation.navigateToApp();
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
        await cases.api.createNthRandomCases(12);
        await header.waitUntilLoadingHasFinished();
        await cases.casesTable.waitForCasesToBeListed();
      });

      after(async () => {
        await cases.api.deleteAllCases();
        await cases.casesTable.waitForCasesToBeDeleted();
      });

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

      // FLAKY: https://github.com/elastic/kibana/issues/148468
      // FLAKY: https://github.com/elastic/kibana/issues/148469
      describe.skip('Severity', () => {
        before(async () => {
          await cases.api.createNthRandomCases(1);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

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
        before(async () => {
          await cases.api.createNthRandomCases(1);
          await header.waitUntilLoadingHasFinished();
          await cases.casesTable.waitForCasesToBeListed();
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await cases.casesTable.waitForCasesToBeDeleted();
        });

        it('deletes a case correctly', async () => {
          await cases.casesTable.deleteCase(0);
          await cases.casesTable.waitForTableToFinishLoading();
          await cases.casesTable.validateCasesTableHasNthRows(0);
        });
      });
    });
  });
};
