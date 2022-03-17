/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import uuid from 'uuid';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  describe.only('Create and edit case ', function () {
    const common = getPageObject('common');
    const header = getPageObject('header');
    const testSubjects = getService('testSubjects');
    const find = getService('find');
    const casesApp = getService('casesApp');
    const retry = getService('retry');
    const comboBox = getService('comboBox');

    before(async () => {
      await common.navigateToApp('casesStackManagement');
    });

    after(async () => {});

    describe('creating a case', () => {
      it('creates a case from the stack managament page', async () => {
        const caseTitle = 'test-' + uuid.v4();
        await casesApp.createCaseFromCreateCasePage(caseTitle);
        const title = await find.byCssSelector('[data-test-subj="header-page-title"]');
        expect(await title.getVisibleText()).equal(caseTitle);
      });
    });

    describe('Edit case', () => {
      // create the case to test on
      before(async () => {
        await common.navigateToApp('casesStackManagement');
        await casesApp.createCaseFromCreateCasePage();
      });

      beforeEach(async () => {
        await common.navigateToApp('casesStackManagement');
        await casesApp.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      it('edits a case title from the case view page', async () => {
        const newTitle = 'test-' + uuid.v4();

        await testSubjects.click('editable-title-edit-icon');
        await testSubjects.setValue('editable-title-input-field', newTitle);
        await testSubjects.click('editable-title-submit-btn');

        // wait for backend response
        await retry.tryForTime(5000, async () => {
          const title = await find.byCssSelector('[data-test-subj="header-page-title"]');
          expect(await title.getVisibleText()).equal(newTitle);
        });
      });

      it('adds a comment to a case', async () => {
        const commentArea = await find.byCssSelector(
          '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
        );
        await commentArea.focus();
        await commentArea.type('Test comment from automation');
        await testSubjects.click('submit-comment');

        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="comment-create-action"] [data-test-subj="user-action-markdown"]'
        );
      });

      it('adds a tag to a case', async () => {
        const tag = uuid.v4();
        await testSubjects.click('tag-list-edit-button');
        await comboBox.setCustom('comboBoxInput', tag);
        await testSubjects.click('edit-tags-submit');

        // validate tag was added
        await testSubjects.existOrFail('tag-' + tag);

        // validate user action
        await find.byCssSelector('[data-test-subj*="tags-add-action"]');
      });

      it('changes a case status to in-progress via dropdown menu', async () => {
        await casesApp.markCaseInProgressViaDropdown();
        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-in-progress"]'
        );
      });

      it('changes a case status to closed via dropdown-menu', async () => {
        await casesApp.markCaseClosedViaDropdown();

        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-closed"]'
        );
      });

      it("reopens a case from the 'reopen case' button", async () => {
        await casesApp.markCaseClosedViaDropdown();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('case-view-status-action-button');
        await header.waitUntilLoadingHasFinished();

        // wait for backend response
        find.byCssSelector(
          '[data-test-subj="header-page-supplements"] [data-test-subj="status-badge-open"]'
        );

        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-open"]'
        );
      });

      it("marks in progress a case from the 'mark in progress' button", async () => {
        await casesApp.markCaseOpenViaDropdown();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('case-view-status-action-button');
        await header.waitUntilLoadingHasFinished();

        find.byCssSelector(
          '[data-test-subj="header-page-supplements"] [data-test-subj="status-badge-in-progress"]'
        );
        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-in-progress"]'
        );
      });

      it("closes a case from the 'close case' button", async () => {
        await casesApp.markCaseInProgressViaDropdown();
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('case-view-status-action-button');
        await header.waitUntilLoadingHasFinished();

        find.byCssSelector(
          '[data-test-subj="header-page-supplements"] [data-test-subj="status-badge-closed"]'
        );
        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-closed"]'
        );
      });
    });

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
          button.click();
          await testSubjects.click('case-view-status-dropdown-in-progress');
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('status-badge-in-progress');
        });

        it('to closed', async () => {
          const button = await find.byCssSelector(
            '[data-test-subj="case-view-status-dropdown"] button'
          );
          button.click();
          await testSubjects.click('case-view-status-dropdown-closed');
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('status-badge-closed');
        });

        it('to open', async () => {
          const button = await find.byCssSelector(
            '[data-test-subj="case-view-status-dropdown"] button'
          );
          button.click();
          await testSubjects.click('case-view-status-dropdown-open');
          await header.waitUntilLoadingHasFinished();
          await testSubjects.existOrFail('status-badge-open');
        });
      });
    });
  });
};
