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
  const common = getPageObject('common');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const casesApp = getService('casesApp');
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  describe('Edit case', () => {
    // create the case to test on
    before(async () => {
      await common.navigateToApp('cases');
      await casesApp.api.createNthRandomCases(1);
    });

    after(async () => {
      await casesApp.api.deleteAllCases();
    });

    beforeEach(async () => {
      await common.navigateToApp('cases');
      await casesApp.common.goToFirstListedCase();
      await header.waitUntilLoadingHasFinished();
    });

    it('edits a case title from the case view page', async () => {
      const newTitle = `test-${uuid.v4()}`;

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
      await casesApp.common.markCaseInProgressViaDropdown();
      // validate user action
      await find.byCssSelector(
        '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-in-progress"]'
      );
    });

    it('changes a case status to closed via dropdown-menu', async () => {
      await casesApp.common.markCaseClosedViaDropdown();

      // validate user action
      await find.byCssSelector(
        '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-closed"]'
      );
    });

    it("reopens a case from the 'reopen case' button", async () => {
      await casesApp.common.markCaseClosedViaDropdown();
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('case-view-status-action-button');
      await header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('header-page-supplements > status-badge-open', {
        timeout: 5000,
      });

      // validate user action
      await find.byCssSelector(
        '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-open"]'
      );
    });

    it("marks in progress a case from the 'mark in progress' button", async () => {
      await casesApp.common.markCaseOpenViaDropdown();
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('case-view-status-action-button');
      await header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('header-page-supplements > status-badge-in-progress', {
        timeout: 5000,
      });

      // validate user action
      await find.byCssSelector(
        '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-in-progress"]'
      );
    });

    it("closes a case from the 'close case' button", async () => {
      await casesApp.common.markCaseInProgressViaDropdown();
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('case-view-status-action-button');
      await header.waitUntilLoadingHasFinished();

      await testSubjects.existOrFail('header-page-supplements > status-badge-closed', {
        timeout: 5000,
      });

      // validate user action
      await find.byCssSelector(
        '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-closed"]'
      );
    });
  });
};
