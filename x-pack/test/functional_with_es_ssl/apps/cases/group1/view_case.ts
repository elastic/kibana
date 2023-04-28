/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { CaseStatuses } from '@kbn/cases-plugin/common';
import { CaseSeverity } from '@kbn/cases-plugin/common/api';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  createUsersAndRoles,
  deleteUsersAndRoles,
} from '../../../../cases_api_integration/common/lib/authentication';
import { users, roles, casesAllUser, casesAllUser2 } from '../common';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const cases = getService('cases');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const security = getPageObject('security');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');

  describe('View case', () => {
    describe('properties', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

      it('edits a case title from the case view page', async () => {
        const newTitle = `test-${uuidv4()}`;

        await testSubjects.click('editable-title-edit-icon');
        await testSubjects.setValue('editable-title-input-field', newTitle);
        await testSubjects.click('editable-title-submit-btn');

        // wait for backend response
        await retry.tryForTime(5000, async () => {
          const title = await find.byCssSelector('[data-test-subj="header-page-title"]');
          expect(await title.getVisibleText()).equal(newTitle);
        });

        // validate user action
        await find.byCssSelector('[data-test-subj*="title-update-action"]');
      });

      it('adds a comment to a case', async () => {
        const commentArea = await find.byCssSelector(
          '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
        );
        await commentArea.focus();
        await commentArea.type('Test comment from automation');
        await testSubjects.click('submit-comment');

        // validate user action
        const newComment = await find.byCssSelector(
          '[data-test-subj*="comment-create-action"] [data-test-subj="scrollable-markdown"]'
        );
        expect(await newComment.getVisibleText()).equal('Test comment from automation');
      });

      it('adds a tag to a case', async () => {
        const tag = uuidv4();
        await testSubjects.click('tag-list-edit-button');
        await comboBox.setCustom('comboBoxInput', tag);
        await testSubjects.click('edit-tags-submit');

        // validate tag was added
        await testSubjects.existOrFail('tag-' + tag);

        // validate user action
        await find.byCssSelector('[data-test-subj*="tags-add-action"]');
      });

      it('deletes a tag from a case', async () => {
        await testSubjects.click('tag-list-edit-button');
        // find the tag button and click the close button
        const button = await find.byCssSelector('[data-test-subj="comboBoxInput"] button');
        await button.click();
        await testSubjects.click('edit-tags-submit');

        // validate user action
        await find.byCssSelector('[data-test-subj*="tags-delete-action"]');
      });

      describe('status', () => {
        it('changes a case status to in-progress via dropdown menu', async () => {
          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-in-progress"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown > case-status-badge-popover-button-in-progress'
          );
        });

        it('changes a case status to closed via dropdown-menu', async () => {
          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.closed);

          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-closed"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown > case-status-badge-popover-button-closed'
          );
        });

        it("reopens a case from the 'reopen case' button", async () => {
          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.closed);
          await header.waitUntilLoadingHasFinished();
          await testSubjects.click('case-view-status-action-button');
          await header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail(
            'header-page-supplements > case-status-badge-popover-button-open',
            {
              timeout: 5000,
            }
          );

          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-open"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown > case-status-badge-popover-button-open'
          );
        });

        it("marks in progress a case from the 'mark in progress' button", async () => {
          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.open);
          await header.waitUntilLoadingHasFinished();
          await testSubjects.click('case-view-status-action-button');
          await header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail(
            'header-page-supplements > case-status-badge-popover-button-in-progress',
            {
              timeout: 5000,
            }
          );

          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-in-progress"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown > case-status-badge-popover-button-in-progress'
          );
        });

        it("closes a case from the 'close case' button", async () => {
          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
          await header.waitUntilLoadingHasFinished();
          await testSubjects.click('case-view-status-action-button');
          await header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail(
            'header-page-supplements > case-status-badge-popover-button-closed',
            {
              timeout: 5000,
            }
          );

          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-closed"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown >case-status-badge-popover-button-closed'
          );
        });
      });

      describe('draft comments', () => {
        createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

        it('persists new comment when status is updated in dropdown', async () => {
          const commentArea = await find.byCssSelector(
            '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
          );
          await commentArea.focus();
          await commentArea.type('Test comment from automation');

          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-in-progress"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown > case-status-badge-popover-button-in-progress'
          );

          await testSubjects.click('submit-comment');

          // validate user action
          const newComment = await find.byCssSelector(
            '[data-test-subj*="comment-create-action"] [data-test-subj="scrollable-markdown"]'
          );
          expect(await newComment.getVisibleText()).equal('Test comment from automation');
        });

        it('persists new comment when case is closed through the close case button', async () => {
          const commentArea = await find.byCssSelector(
            '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
          );
          await commentArea.focus();
          await commentArea.type('Test comment from automation');

          await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
          await header.waitUntilLoadingHasFinished();
          await testSubjects.click('case-view-status-action-button');
          await header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail(
            'header-page-supplements > case-status-badge-popover-button-closed',
            {
              timeout: 5000,
            }
          );

          // validate user action
          await find.byCssSelector(
            '[data-test-subj*="status-update-action"] [data-test-subj="case-status-badge-closed"]'
          );
          // validates dropdown tag
          await testSubjects.existOrFail(
            'case-view-status-dropdown >case-status-badge-popover-button-closed'
          );

          await testSubjects.click('submit-comment');

          // validate user action
          const newComment = await find.byCssSelector(
            '[data-test-subj*="comment-create-action"] [data-test-subj="scrollable-markdown"]'
          );
          expect(await newComment.getVisibleText()).equal('Test comment from automation');
        });

        it('persists new comment to the case when user goes to case list table and comes back to the case', async () => {
          const commentArea = await find.byCssSelector(
            '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
          );
          await commentArea.focus();
          await commentArea.type('Test comment from automation');

          await testSubjects.click('backToCases');

          const caseLink = await find.byCssSelector('[data-test-subj="case-details-link"');

          caseLink.click();

          await testSubjects.click('submit-comment');

          // validate user action
          const newComment = await find.byCssSelector(
            '[data-test-subj*="comment-create-action"] [data-test-subj="scrollable-markdown"]'
          );
          expect(await newComment.getVisibleText()).equal('Test comment from automation');
        });

        it('shows unsaved comment message when page is refreshed', async () => {
          const commentArea = await find.byCssSelector(
            '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
          );
          await commentArea.focus();
          await commentArea.type('Test comment from automation');

          await testSubjects.click('submit-comment');

          await header.waitUntilLoadingHasFinished();

          await testSubjects.click('property-actions-user-action-ellipses');

          await header.waitUntilLoadingHasFinished();

          await testSubjects.click('property-actions-user-action-pencil');

          await header.waitUntilLoadingHasFinished();

          const editCommentTextArea = await find.byCssSelector(
            '[data-test-subj*="editable-markdown-form"] textarea.euiMarkdownEditorTextArea'
          );

          await header.waitUntilLoadingHasFinished();

          await editCommentTextArea.focus();
          await editCommentTextArea.type('Edited comment');

          await browser.refresh();

          await header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail('user-action-comment-unsaved-draft');
        });

        it('shows unsaved description message when page is refreshed', async () => {
          await testSubjects.click('description-edit-icon');

          await header.waitUntilLoadingHasFinished();

          const editCommentTextArea = await find.byCssSelector(
            '[data-test-subj*="editable-markdown-form"] textarea.euiMarkdownEditorTextArea'
          );

          await header.waitUntilLoadingHasFinished();

          await editCommentTextArea.focus();
          await editCommentTextArea.type('Edited description');

          await header.waitUntilLoadingHasFinished();

          await browser.refresh();

          await header.waitUntilLoadingHasFinished();

          await testSubjects.existOrFail('description-unsaved-draft');
        });
      });
    });

    describe('actions', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

      it('deletes the case successfully', async () => {
        await cases.singleCase.deleteCase();
        await cases.casesTable.waitForTableToFinishLoading();
        await cases.casesTable.validateCasesTableHasNthRows(0);
      });
    });

    describe('Severity field', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

      it('shows the severity field on the sidebar', async () => {
        await testSubjects.existOrFail('case-severity-selection');
      });

      it('changes the severity level from the selector', async () => {
        await cases.common.selectSeverity(CaseSeverity.MEDIUM);
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('case-severity-selection-' + CaseSeverity.MEDIUM);

        // validate user action
        await find.byCssSelector('[data-test-subj*="severity-update-action"]');
      });
    });

    describe('filter activity', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

      it('filters by comment successfully', async () => {
        const commentBadge = await find.byCssSelector(
          '[data-test-subj="user-actions-filter-activity-button-comments"] span.euiNotificationBadge'
        );

        expect(await commentBadge.getVisibleText()).equal('0');

        const commentArea = await find.byCssSelector(
          '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
        );
        await commentArea.focus();
        await commentArea.type('Test comment from automation');
        await testSubjects.click('submit-comment');

        await header.waitUntilLoadingHasFinished();

        expect(await commentBadge.getVisibleText()).equal('1');
      });

      it('filters by history successfully', async () => {
        const historyBadge = await find.byCssSelector(
          '[data-test-subj="user-actions-filter-activity-button-history"] span.euiNotificationBadge'
        );

        expect(await historyBadge.getVisibleText()).equal('1');

        await cases.common.selectSeverity(CaseSeverity.MEDIUM);

        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);

        await header.waitUntilLoadingHasFinished();

        await testSubjects.click('user-actions-filter-activity-button-history');

        expect(await historyBadge.getVisibleText()).equal('3');
      });

      it('sorts by newest first successfully', async () => {
        await testSubjects.click('user-actions-filter-activity-button-all');

        const AllBadge = await find.byCssSelector(
          '[data-test-subj="user-actions-filter-activity-button-all"] span.euiNotificationBadge'
        );

        expect(await AllBadge.getVisibleText()).equal('4');

        const sortDesc = await find.byCssSelector(
          '[data-test-subj="user-actions-sort-select"] [value="desc"]'
        );

        await sortDesc.click();

        await header.waitUntilLoadingHasFinished();

        const userActionsLists = await find.allByCssSelector(
          '[data-test-subj="user-actions-list"]'
        );

        const actionList = await userActionsLists[0].findAllByClassName('euiComment');

        expect(await actionList[0].getAttribute('data-test-subj')).contain('status-update-action');
      });
    });

    describe('pagination', async () => {
      let createdCase: any;

      before(async () => {
        await cases.navigation.navigateToApp();
        createdCase = await cases.api.createCase({ title: 'Pagination feature' });
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('shows more actions on button click', async () => {
        await cases.api.generateUserActions({
          caseId: createdCase.id,
          caseVersion: createdCase.version,
          totalUpdates: 4,
        });

        await header.waitUntilLoadingHasFinished();

        await testSubjects.click('case-refresh');

        await header.waitUntilLoadingHasFinished();

        expect(testSubjects.existOrFail('cases-show-more-user-actions'));

        const userActionsLists = await find.allByCssSelector(
          '[data-test-subj="user-actions-list"]'
        );

        expect(userActionsLists).length(2);

        expect(await userActionsLists[0].findAllByClassName('euiComment')).length(10);

        expect(await userActionsLists[1].findAllByClassName('euiComment')).length(4);

        testSubjects.click('cases-show-more-user-actions');

        await header.waitUntilLoadingHasFinished();

        expect(await userActionsLists[0].findAllByClassName('euiComment')).length(20);

        expect(await userActionsLists[1].findAllByClassName('euiComment')).length(4);
      });
    });

    describe('Assignees field', () => {
      before(async () => {
        await createUsersAndRoles(getService, users, roles);
        await cases.api.activateUserProfiles([casesAllUser, casesAllUser2]);
      });

      after(async () => {
        await deleteUsersAndRoles(getService, users, roles);
      });

      describe('unknown users', () => {
        beforeEach(async () => {
          await kibanaServer.importExport.load(
            'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_assignees.json'
          );

          await cases.navigation.navigateToApp();
          await cases.casesTable.waitForCasesToBeListed();
          await cases.casesTable.goToFirstListedCase();
          await header.waitUntilLoadingHasFinished();
        });

        afterEach(async () => {
          await kibanaServer.importExport.unload(
            'x-pack/test/functional/fixtures/kbn_archiver/cases/8.5.0/cases_assignees.json'
          );

          await cases.api.deleteAllCases();
        });

        it('shows the unknown assignee', async () => {
          await testSubjects.existOrFail('user-profile-assigned-user-group-abc');
        });

        it('removes the unknown assignee when selecting the remove all users in the popover', async () => {
          await testSubjects.existOrFail('user-profile-assigned-user-group-abc');

          await cases.singleCase.openAssigneesPopover();
          await cases.common.setSearchTextInAssigneesPopover('case');
          await cases.common.selectFirstRowInAssigneesPopover();

          await (await find.byButtonText('Remove all assignees')).click();
          await cases.singleCase.closeAssigneesPopover();
          await testSubjects.missingOrFail('user-profile-assigned-user-group-abc');
        });
      });

      describe('login with cases all user', () => {
        before(async () => {
          await security.forceLogout();
          await security.login(casesAllUser.username, casesAllUser.password);
          await createAndNavigateToCase(getPageObject, getService);
        });

        after(async () => {
          await cases.api.deleteAllCases();
          await security.forceLogout();
        });

        it('assigns the case to the current user when clicking the assign to self link', async () => {
          await testSubjects.click('case-view-assign-yourself-link');
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user');
        });
      });

      describe('logs in with default user', () => {
        beforeEach(async () => {
          await createAndNavigateToCase(getPageObject, getService);
        });

        afterEach(async () => {
          await cases.api.deleteAllCases();
        });

        it('shows the assign users popover when clicked', async () => {
          await testSubjects.missingOrFail('euiSelectableList');
          await cases.singleCase.openAssigneesPopover();
          await cases.singleCase.closeAssigneesPopover();
        });

        it('assigns a user from the popover', async () => {
          await cases.singleCase.openAssigneesPopover();
          await cases.common.setSearchTextInAssigneesPopover('case');
          await cases.common.selectFirstRowInAssigneesPopover();
          await cases.singleCase.closeAssigneesPopover();
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user');
        });

        it('assigns multiple users', async () => {
          await cases.singleCase.openAssigneesPopover();
          await cases.common.setSearchTextInAssigneesPopover('case');
          await cases.common.selectAllRowsInAssigneesPopover();

          await cases.singleCase.closeAssigneesPopover();
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user');
          await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user2');
        });
      });

      describe('logs in with default user and creates case before each', () => {
        createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

        it('removes an assigned user', async () => {
          await cases.singleCase.openAssigneesPopover();
          await cases.common.setSearchTextInAssigneesPopover('case');
          await cases.common.selectFirstRowInAssigneesPopover();

          // navigate out of the modal
          await cases.singleCase.closeAssigneesPopover();
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('user-profile-assigned-user-group-cases_all_user');

          // hover over the assigned user
          await (
            await find.byCssSelector(
              '[data-test-subj="user-profile-assigned-user-group-cases_all_user"]'
            )
          ).moveMouseTo();

          // delete the user
          await testSubjects.click('user-profile-assigned-user-cross-cases_all_user');

          await testSubjects.existOrFail('case-view-assign-yourself-link');
        });
      });
    });

    describe('Tabs', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

      it('shows the "activity" tab by default', async () => {
        await testSubjects.existOrFail('case-view-tab-title-activity');
        await testSubjects.existOrFail('case-view-tab-content-activity');
      });

      // there are no alerts in stack management yet
      it.skip("shows the 'alerts' tab when clicked", async () => {
        await testSubjects.click('case-view-tab-title-alerts');
        await testSubjects.existOrFail('case-view-tab-content-alerts');
      });

      it("shows the 'files' tab when clicked", async () => {
        await testSubjects.click('case-view-tab-title-files');
        await testSubjects.existOrFail('case-view-tab-content-files');
      });
    });

    describe('Files', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService);

      it('adds a file to the case', async () => {
        // navigate to files tab
        await testSubjects.click('case-view-tab-title-files');
        await testSubjects.existOrFail('case-view-tab-content-files');

        await cases.casesFilesTable.addFile(require.resolve('./elastic_logo.png'));

        // make sure the uploaded file is displayed on the table
        await find.byButtonText('elastic_logo.png');
      });

      it('search by file name', async () => {
        await cases.casesFilesTable.searchByFileName('foobar');

        await cases.casesFilesTable.emptyOrFail();

        await cases.casesFilesTable.searchByFileName('elastic');

        await find.byButtonText('elastic_logo.png');
      });

      it('displays the file preview correctly', async () => {
        await cases.casesFilesTable.openFilePreview(0);

        await testSubjects.existOrFail('cases-files-image-preview');
      });

      it('pressing escape key closes the file preview', async () => {
        await testSubjects.existOrFail('cases-files-image-preview');

        await browser.pressKeys(browser.keys.ESCAPE);

        await testSubjects.missingOrFail('cases-files-image-preview');
      });

      it('files added to a case can be deleted', async () => {
        await cases.casesFilesTable.deleteFile(0);

        await cases.casesFilesTable.emptyOrFail();
      });

      describe('Files User Activity', () => {
        it('file user action is displayed correctly', async () => {
          await cases.casesFilesTable.addFile(require.resolve('./elastic_logo.png'));

          await testSubjects.click('case-view-tab-title-activity');
          await testSubjects.existOrFail('case-view-tab-content-activity');

          await find.byButtonText('elastic_logo.png');
        });
      });
    });
  });
};

const createOneCaseBeforeDeleteAllAfter = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService']
) => {
  const cases = getService('cases');

  before(async () => {
    await createAndNavigateToCase(getPageObject, getService);
  });

  after(async () => {
    await cases.api.deleteAllCases();
  });
};

const createAndNavigateToCase = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService']
) => {
  const header = getPageObject('header');
  const cases = getService('cases');

  await cases.navigation.navigateToApp();
  await cases.api.createNthRandomCases(1);
  await cases.casesTable.waitForCasesToBeListed();
  await cases.casesTable.goToFirstListedCase();
  await header.waitUntilLoadingHasFinished();
};
