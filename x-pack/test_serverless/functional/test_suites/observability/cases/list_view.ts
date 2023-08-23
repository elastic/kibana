/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseSeverity, CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import { SeverityAll } from '@kbn/cases-plugin/common/ui';
// import { UserProfile } from '@kbn/user-profile-components';
import { FtrProviderContext } from '../../../ftr_provider_context';
// import { users, roles,  createUsersAndRoles, deleteUsersAndRoles, } from '../../../../shared/lib';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlObltNavigation = getService('svlObltNavigation');

  describe.only('cases list', () => {
    before(async () => {
      await svlObltNavigation.navigateToLandingPage();
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
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
        await cases.api.createNthRandomCases(2, 'observability');
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
          await cases.api.createNthRandomCases(8, 'observability');
          await cases.api.createCase({ title: 'delete me', tags: ['one'], owner: 'observability' });
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
          await cases.api.createNthRandomCases(2, 'observability');
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
          await cases.api.createNthRandomCases(2, 'observability');
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
          const case1 = await cases.api.createCase({ title: 'case 1', tags: ['one', 'three'], owner: 'observability' });
          const case2 = await cases.api.createCase({ title: 'case 2', tags: ['two', 'four'], owner: 'observability' });
          const case3 = await cases.api.createCase({ title: 'case 3', tags: ['two', 'five'], owner: 'observability' });

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

      // describe('assignees', () => {
      //   let caseIds: string[] = [];
      //   let profiles: UserProfile[] = [];

      //   const findAssigneeByUserName = (username: string) =>
      //     profiles.find((profile) => profile.user.username === username);

      //   before(async () => {
      //     await createUsersAndRoles(getService, users, roles);
      //     await cases.api.activateUserProfiles(users);

      //     profiles = await cases.api.suggestUserProfiles({
      //       name: '',
      //       owners: ['observability'],
      //     });

      //     console.log('CHUNKU', profiles);
      //   });

      //   beforeEach(async () => {
      //     caseIds = [];
      //     const casesAll = findAssigneeByUserName('cases_all_user')!;
      //     const casesAll2 = findAssigneeByUserName('cases_all_user2')!;
      //     const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;

      //     const case1 = await cases.api.createCase({
      //       title: 'case 1',
      //       assignees: [{ uid: casesAll.uid }],
      //       owner: 'observability'
      //     });

      //     const case2 = await cases.api.createCase({
      //       title: 'case 2',
      //       assignees: [{ uid: casesAll2.uid }, { uid: casesNoDelete.uid }],
      //       owner: 'observability'
      //     });

      //     const case3 = await cases.api.createCase({
      //       title: 'case 3',
      //       assignees: [{ uid: casesAll2.uid }],
      //       owner: 'observability'
      //     });

      //     caseIds.push(case1.id);
      //     caseIds.push(case2.id);
      //     caseIds.push(case3.id);

      //     await header.waitUntilLoadingHasFinished();
      //     await cases.casesTable.waitForCasesToBeListed();
      //   });

      //   afterEach(async () => {
      //     await cases.api.deleteAllCases();
      //     await cases.casesTable.waitForCasesToBeDeleted();
      //   });

      //   after(async () => {
      //     await deleteUsersAndRoles(getService, users, roles);
      //   });

      //   it('bulk edit assignees', async () => {
      //     const casesAll2 = findAssigneeByUserName('cases_all_user2')!;
      //     const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;
      //     const casesAll = findAssigneeByUserName('cases_all_user')!;

      //     /**
      //      * Case 3 assignees: cases_all_user2
      //      * Case 2 assignees: cases_all_user2, cases_no_delete_user
      //      * Case 1 assignees: cases_all_user
      //      * All assignees: cases_all_user, cases_all_user2, cases_read_delete_user, cases_no_delete_user
      //      *
      //      * It selects Case 3 and Case 2 because the table orders
      //      * the cases in descending order by creation date and clicks
      //      * the cases_all_user2, cases_no_delete_user
      //      */

      //     await cases.casesTable.bulkEditAssignees([0, 1], [casesAll2.uid, casesNoDelete.uid]);

      //     await header.waitUntilLoadingHasFinished();

      //     const case1 = await cases.api.getCase({ caseId: caseIds[0] });
      //     const case2 = await cases.api.getCase({ caseId: caseIds[1] });
      //     const case3 = await cases.api.getCase({ caseId: caseIds[2] });

      //     expect(case3.assignees).eql([{ uid: casesNoDelete.uid }]);
      //     expect(case2.assignees).eql([{ uid: casesNoDelete.uid }]);
      //     expect(case1.assignees).eql([{ uid: casesAll.uid }]);
      //   });

      //   it('adds a new assignee', async () => {
      //     const casesNoDelete = findAssigneeByUserName('cases_no_delete_user')!;
      //     const casesAll = findAssigneeByUserName('cases_all_user')!;
      //     const casesAll2 = findAssigneeByUserName('cases_all_user2')!;

      //     await cases.casesTable.bulkAddNewAssignees([0, 1], 'cases all_user');
      //     await header.waitUntilLoadingHasFinished();

      //     const case1 = await cases.api.getCase({ caseId: caseIds[0] });
      //     const case2 = await cases.api.getCase({ caseId: caseIds[1] });
      //     const case3 = await cases.api.getCase({ caseId: caseIds[2] });

      //     expect(case3.assignees).eql([{ uid: casesAll2.uid }, { uid: casesAll.uid }]);
      //     expect(case2.assignees).eql([
      //       { uid: casesAll2.uid },
      //       { uid: casesNoDelete.uid },
      //       { uid: casesAll.uid },
      //     ]);
      //     expect(case1.assignees).eql([{ uid: casesAll.uid }]);
      //   });
      // });
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
        await cases.api.createNthRandomCases(12, 'observability');
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
          await cases.api.createNthRandomCases(1, 'observability');
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

      describe('Severity', () => {
        before(async () => {
          await cases.api.createNthRandomCases(1, 'observability');
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
          await cases.api.createNthRandomCases(1, 'observability');
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
