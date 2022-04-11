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
  const common = getPageObject('common');
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const cases = getService('cases');
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  // Failing: See https://github.com/elastic/kibana/issues/129248
  describe.skip('View case', () => {
    describe('properties', () => {
      // create the case to test on
      before(async () => {
        await cases.navigation.navigateToApp();
        await cases.api.createNthRandomCases(1);
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await cases.api.deleteAllCases();
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
          '[data-test-subj*="comment-create-action"] [data-test-subj="user-action-markdown"]'
        );
        expect(await newComment.getVisibleText()).equal('Test comment from automation');
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

      it('deletes a tag from a case', async () => {
        await testSubjects.click('tag-list-edit-button');
        // find the tag button and click the close button
        const button = await find.byCssSelector('[data-test-subj="comboBoxInput"] button');
        await button.click();
        await testSubjects.click('edit-tags-submit');

        // validate user action
        await find.byCssSelector('[data-test-subj*="tags-delete-action"]');
      });

      it('changes a case status to in-progress via dropdown menu', async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-in-progress"]'
        );
        // validates dropdown tag
        await testSubjects.existOrFail('case-view-status-dropdown > status-badge-in-progress');
      });

      it('changes a case status to closed via dropdown-menu', async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.closed);

        // validate user action
        await find.byCssSelector(
          '[data-test-subj*="status-update-action"] [data-test-subj="status-badge-closed"]'
        );
        // validates dropdown tag
        await testSubjects.existOrFail('case-view-status-dropdown > status-badge-closed');
      });

      it("reopens a case from the 'reopen case' button", async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.closed);
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
        // validates dropdown tag
        await testSubjects.existOrFail('case-view-status-dropdown > status-badge-open');
      });

      it("marks in progress a case from the 'mark in progress' button", async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses.open);
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
        // validates dropdown tag
        await testSubjects.existOrFail('case-view-status-dropdown > status-badge-in-progress');
      });

      it("closes a case from the 'close case' button", async () => {
        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);
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
        // validates dropdown tag
        await testSubjects.existOrFail('case-view-status-dropdown > status-badge-closed');
      });
    });

    describe('actions', () => {
      // create the case to test on
      before(async () => {
        await cases.navigation.navigateToApp();
        await cases.api.createNthRandomCases(1);
        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await cases.api.deleteAllCases();
      });

      it('deletes the case successfully', async () => {
        await common.clickAndValidate('property-actions-ellipses', 'property-actions-trash');
        await common.clickAndValidate('property-actions-trash', 'confirmModalConfirmButton');
        await testSubjects.click('confirmModalConfirmButton');
        await testSubjects.existOrFail('cases-all-title', { timeout: 2000 });
        await cases.casesTable.validateCasesTableHasNthRows(0);
      });
    });
  });
};
