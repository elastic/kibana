/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import {
  CaseSeverity,
  CaseStatuses,
  CustomFieldTypes,
} from '@kbn/cases-plugin/common/types/domain';

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import {
  createOneCaseBeforeDeleteAllAfter,
  createAndNavigateToCase,
  navigateToCasesApp,
} from '@kbn/test-suites-xpack-platform/serverless/shared/lib/cases/helpers';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const owner = SECURITY_SOLUTION_OWNER;

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const find = getService('find');
  const config = getService('config');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');

  describe('Case View', function () {
    before(async () => {
      await svlCommonPage.loginWithPrivilegedRole();
    });

    after(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    describe('page', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

      it('should show the case view page correctly', async () => {
        if (await cases.common.isRedesignEnabled()) {
          await testSubjects.existOrFail('appHeaderTitle');

          await testSubjects.existOrFail('case-view-tab-title-activity');
          await testSubjects.existOrFail('case-view-tab-title-attachments');
          await testSubjects.existOrFail('description');

          await testSubjects.existOrFail('case-view-activity');

          await testSubjects.existOrFail('case-view-assignees-field-panel');
          await testSubjects.existOrFail('sidebar-severity');
          await testSubjects.existOrFail('case-view-participants-field-panel');
          await testSubjects.existOrFail('case-tags');
          await testSubjects.existOrFail('cases-categories');
          await testSubjects.existOrFail('case-view-sidebar-connectors');
          return;
        }

        await testSubjects.existOrFail('case-view-title');
        await testSubjects.existOrFail('header-page-supplements');

        await testSubjects.existOrFail('case-view-tab-title-activity');
        await testSubjects.existOrFail('case-view-tab-title-attachments');
        await testSubjects.existOrFail('description');

        await testSubjects.existOrFail('case-view-activity');

        await testSubjects.existOrFail('case-view-assignees');
        await testSubjects.existOrFail('sidebar-severity');
        await testSubjects.existOrFail('case-view-user-list-reporter');
        await testSubjects.existOrFail('case-view-user-list-participants');
        await testSubjects.existOrFail('case-view-tag-list');
        await testSubjects.existOrFail('cases-categories');
        await testSubjects.existOrFail('sidebar-connectors');
      });
    });

    describe('properties', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

      it('edits a case title from the case view page', async () => {
        const newTitle = `test-${uuidv4()}`;

        await cases.common.editCaseTitle(newTitle);
        await cases.common.assertCaseTitle(newTitle);

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
          '[data-test-subj="comment-comment-comment"] [data-test-subj="scrollable-markdown"]'
        );
        expect(await newComment.getVisibleText()).equal('Test comment from automation');
      });

      it('adds a category to a case', async () => {
        const category = uuidv4();
        await cases.common.addCategory(category);

        // Legacy renders a dedicated viewer; the redesign edits the value in place, so we rely on the
        // user action below to confirm the update landed.
        if (!(await cases.common.isRedesignEnabled())) {
          await testSubjects.existOrFail('category-viewer-' + category);
        }

        // validate user action
        await find.byCssSelector('[data-test-subj*="category-update-action"]');
      });

      it('deletes a category from a case', async () => {
        await cases.common.removeCategory();

        if (!(await cases.common.isRedesignEnabled())) {
          await testSubjects.existOrFail('no-categories');
        }
        // validate user action
        await find.byCssSelector('[data-test-subj*="category-delete-action"]');
      });

      it('adds a tag to a case', async () => {
        const tag = uuidv4();
        await cases.common.addTag(tag);

        // Legacy renders a dedicated tag element; the redesign edits the value in place, so we rely on
        // the user action below to confirm the update landed.
        if (!(await cases.common.isRedesignEnabled())) {
          await testSubjects.existOrFail('tag-' + tag);
        }

        // validate user action
        await find.byCssSelector('[data-test-subj*="tags-add-action"]');
      });

      it('deletes a tag from a case', async () => {
        if (await cases.common.isRedesignEnabled()) {
          await comboBox.clear('case-tags');
          await testSubjects.click('template-field-confirm-tags');
          await header.waitUntilLoadingHasFinished();
        } else {
          await testSubjects.click('tag-list-edit-button');
          // find the tag button and click the close button
          const button = await find.byCssSelector('[data-test-subj="comboBoxInput"] button');
          await button.click();
          await testSubjects.click('edit-tags-submit');
        }

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
          // validates dropdown tag (legacy renders the status badge inside the action-bar dropdown)
          if (!(await cases.common.isRedesignEnabled())) {
            await testSubjects.existOrFail(
              'case-view-status-dropdown > case-status-badge-popover-button-in-progress'
            );
          }
        });
      });

      describe('Severity field', () => {
        createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

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
    });

    describe('actions', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

      it('deletes the case successfully', async () => {
        await cases.singleCase.deleteCase();
        await cases.casesTable.waitForTableToFinishLoading();
        await cases.casesTable.validateCasesTableHasNthRows(0);
      });
    });

    describe('filter activity', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

      beforeEach(async function () {
        // The redesign consolidates the activity type filters into a single dropdown
        // (`user-actions-filter-bar-type-button`) with popover options and plain count badges rather
        // than the legacy inline toggle buttons with `euiNotificationBadge` "N active filters" labels
        // these assertions read; the redesign filter bar has its own unit coverage.
        if (await cases.common.isRedesignEnabled()) {
          this.skip();
        }
      });

      it('filters by all by default', async () => {
        const allBadge = await find.byCssSelector(
          '[data-test-subj="user-actions-filter-activity-button-all"] span.euiNotificationBadge'
        );

        expect(await allBadge.getAttribute('aria-label')).equal('1 active filters');
      });

      it('filters by comment successfully', async () => {
        const commentBadge = await find.byCssSelector(
          '[data-test-subj="user-actions-filter-activity-button-comments"] span.euiNotificationBadge'
        );

        expect(await commentBadge.getAttribute('aria-label')).equal('0 available filters');

        const commentArea = await find.byCssSelector(
          '[data-test-subj="add-comment"] textarea.euiMarkdownEditorTextArea'
        );
        await commentArea.focus();
        await commentArea.type('Test comment from automation');
        await testSubjects.click('submit-comment');

        await header.waitUntilLoadingHasFinished();

        await testSubjects.click('user-actions-filter-activity-button-comments');

        expect(await commentBadge.getAttribute('aria-label')).equal('1 active filters');
      });

      it('filters by history successfully', async () => {
        const historyBadge = await find.byCssSelector(
          '[data-test-subj="user-actions-filter-activity-button-history"] span.euiNotificationBadge'
        );

        expect(await historyBadge.getAttribute('aria-label')).equal('1 available filters');

        await cases.common.selectSeverity(CaseSeverity.MEDIUM);

        await header.waitUntilLoadingHasFinished();

        await cases.common.changeCaseStatusViaDropdownAndVerify(CaseStatuses['in-progress']);

        await header.waitUntilLoadingHasFinished();

        await testSubjects.click('user-actions-filter-activity-button-history');

        expect(await historyBadge.getAttribute('aria-label')).equal('3 active filters');
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

    // FLAKY
    describe.skip('Lens visualization', () => {
      before(async () => {
        await cases.testResources.installKibanaSampleData('logs');
        await createAndNavigateToCase(getPageObject, getService, owner);
      });

      after(async () => {
        await cases.testResources.removeKibanaSampleData('logs');
        await svlCases.api.deleteAllCaseItems();
      });

      it('adds lens visualization in description', async () => {
        await testSubjects.click('description-edit-icon');

        await header.waitUntilLoadingHasFinished();

        const editCommentTextArea = await find.byCssSelector(
          '[data-test-subj*="editable-markdown-form"] textarea.euiMarkdownEditorTextArea'
        );

        await header.waitUntilLoadingHasFinished();

        await editCommentTextArea.focus();

        const editableDescription = await testSubjects.find('editable-markdown-form');

        const addVisualizationButton = await editableDescription.findByCssSelector(
          '[data-test-subj="euiMarkdownEditorToolbarButton"][aria-label="Visualization"]'
        );
        await addVisualizationButton.click();

        await cases.singleCase.findAndSaveVisualization('[Logs] Bytes distribution');

        await header.waitUntilLoadingHasFinished();

        await testSubjects.click('editable-save-markdown');

        await header.waitUntilLoadingHasFinished();

        const description = await find.byCssSelector('[data-test-subj="description"]');

        await description.findByCssSelector('[data-test-subj="xyVisChart"]');
      });
    });

    describe('pagination', () => {
      let createdCase: any;

      before(async () => {
        createdCase = await createAndNavigateToCase(getPageObject, getService, owner);
      });

      after(async () => {
        await svlCases.api.deleteAllCaseItems();
      });

      beforeEach(async function () {
        // The redesign renders all activity (paged actions, the show-more row, and the latest actions)
        // in a single `user-actions-list`, whereas these assertions expect the legacy two-list DOM with
        // fixed per-list counts; the redesign pagination has its own unit coverage.
        if (await cases.common.isRedesignEnabled()) {
          this.skip();
        }
      });

      it('initially renders user actions list correctly', async () => {
        await testSubjects.missingOrFail('cases-show-more-user-actions');

        const userActionsLists = await find.allByCssSelector(
          '[data-test-subj="user-actions-list"]'
        );

        expect(userActionsLists).length(1);
      });

      it('shows more actions on button click', async () => {
        await cases.api.generateUserActions({
          caseId: createdCase.id,
          caseVersion: createdCase.version,
          totalUpdates: 4,
        });

        await testSubjects.missingOrFail('user-actions-loading');

        await header.waitUntilLoadingHasFinished();

        await testSubjects.click('case-refresh');

        await header.waitUntilLoadingHasFinished();

        await testSubjects.existOrFail('cases-show-more-user-actions');

        const userActionsLists = await find.allByCssSelector(
          '[data-test-subj="user-actions-list"]'
        );

        expect(userActionsLists).length(2);

        expect(await userActionsLists[0].findAllByCssSelector('li')).length(10);

        expect(await userActionsLists[1].findAllByCssSelector('li')).length(4);

        await testSubjects.click('cases-show-more-user-actions');

        await header.waitUntilLoadingHasFinished();

        expect(await userActionsLists[0].findAllByCssSelector('li')).length(20);
      });
    });

    describe('Tabs', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

      it('shows the "activity" tab by default', async () => {
        await testSubjects.existOrFail('case-view-tab-title-activity');
        await testSubjects.existOrFail('case-view-tab-content-activity');
      });

      it("shows the 'attachments' tab when clicked", async () => {
        await testSubjects.click('case-view-tab-title-attachments');
        await testSubjects.existOrFail('case-view-attachments');
      });
    });

    describe('Files', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);
      before(async () => {
        // open attachments to have access to the files tab
        await testSubjects.click('case-view-tab-title-attachments');
      });
      it('adds a file to the case', async () => {
        await cases.casesFilesTable.addFile(require.resolve('./note.txt'));

        const uploadedFileName = await testSubjects.getVisibleText('cases-files-name-text');
        expect(uploadedFileName).to.be('note.txt');
      });

      it('search by file name', async () => {
        await cases.casesFilesTable.searchByFileName('foobar');
        await cases.casesFilesTable.emptyOrFail();
        await cases.casesFilesTable.searchByFileName('note');

        const uploadedFileName = await testSubjects.getVisibleText('cases-files-name-text');
        expect(uploadedFileName).to.be('note.txt');
      });

      it('files added to a case can be deleted', async () => {
        await cases.casesFilesTable.deleteFile(0);
        await cases.casesFilesTable.emptyOrFail();
      });

      describe('Files User Activity', () => {
        it('file user action is displayed correctly', async () => {
          await cases.casesFilesTable.addFile(require.resolve('./note.txt'));

          await testSubjects.click('case-view-tab-title-activity');
          await testSubjects.existOrFail('case-view-tab-content-activity');

          const uploadedFileName = await testSubjects.getVisibleText('cases-files-name-text');
          expect(uploadedFileName).to.be('note.txt');
        });
      });
    });

    describe('breadcrumbs', () => {
      let createdCase: any;

      before(async () => {
        createdCase = await createAndNavigateToCase(getPageObject, getService, owner);
      });

      after(async () => {
        await svlCases.api.deleteAllCaseItems();
      });

      it('should set the cases title', async () => {
        await svlCommonNavigation.breadcrumbs.expectExists();
        await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: createdCase.title });
      });
    });

    describe('reporter', () => {
      createOneCaseBeforeDeleteAllAfter(getPageObject, getService, owner);

      it('should render the reporter correctly', async () => {
        expect(await cases.singleCase.getReporterName()).to.be(
          config.get('servers.kibana.username')
        );
      });
    });

    describe('customFields', () => {
      const customFields = [
        {
          key: 'valid_key_1',
          label: 'Summary',
          type: CustomFieldTypes.TEXT as const,
          defaultValue: 'foobar',
          required: true,
        },
        {
          key: 'valid_key_2',
          label: 'Sync',
          type: CustomFieldTypes.TOGGLE as const,
          defaultValue: false,
          required: true,
        },
      ];

      before(async function () {
        // The redesign only renders case-view custom fields when templates v2 (`templates.enabled`) is
        // on, which defaults off; these assertions target the legacy sidebar custom-field editors.
        if (await cases.common.isRedesignEnabled()) {
          return this.skip();
        }

        await navigateToCasesApp(getPageObject, getService, owner);
        await cases.api.createConfigWithCustomFields({ customFields, owner });
        await cases.api.createCase({
          customFields: [
            {
              key: 'valid_key_1',
              type: CustomFieldTypes.TEXT,
              value: 'this is a text field value',
            },
            {
              key: 'valid_key_2',
              type: CustomFieldTypes.TOGGLE,
              value: true,
            },
          ],
          owner,
        });

        await cases.casesTable.waitForCasesToBeListed();
        await cases.casesTable.goToFirstListedCase();
        await header.waitUntilLoadingHasFinished();
      });

      afterEach(async () => {
        await svlCases.api.deleteAllCaseItems();
      });

      it('updates a custom field correctly', async () => {
        const textField = await testSubjects.find(`case-text-custom-field-${customFields[0].key}`);
        expect(await textField.getVisibleText()).equal('this is a text field value');

        const toggle = await testSubjects.find(
          `case-toggle-custom-field-form-field-${customFields[1].key}`
        );
        expect(await toggle.getAttribute('aria-checked')).equal('true');

        await testSubjects.click(`case-text-custom-field-edit-button-${customFields[0].key}`);

        await retry.waitFor('custom field edit form to exist', async () => {
          return await testSubjects.exists(
            `case-text-custom-field-form-field-${customFields[0].key}`
          );
        });

        const inputField = await testSubjects.find(
          `case-text-custom-field-form-field-${customFields[0].key}`
        );

        await inputField.type(' edited!!');

        await testSubjects.click(`case-text-custom-field-submit-button-${customFields[0].key}`);

        await header.waitUntilLoadingHasFinished();

        await toggle.click({
          bottomOffset: 100 /* account for fixed footer when deciding if toggle is visible */,
        });

        await header.waitUntilLoadingHasFinished();

        expect(await textField.getVisibleText()).equal('this is a text field value edited!!');

        expect(await toggle.getAttribute('aria-checked')).equal('false');

        // validate user action
        const userActions = await find.allByCssSelector(
          '[data-test-subj*="customFields-update-action"]'
        );

        expect(userActions).length(2);
      });
    });
  });
};
