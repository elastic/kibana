/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common';
import { CaseSeverityWithAll } from '@kbn/cases-plugin/common/ui';
import { CaseSeverity } from '@kbn/cases-plugin/common/api';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';
import { CasesCommon } from './common';

export function CasesTableServiceProvider(
  { getService, getPageObject }: FtrProviderContext,
  casesCommon: CasesCommon
) {
  const common = getPageObject('common');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const header = getPageObject('header');
  const retry = getService('retry');
  const config = getService('config');

  const assertCaseExists = (index: number, totalCases: number) => {
    if (index > totalCases - 1) {
      throw new Error('Cannot get case from table. Index is greater than the length of all rows');
    }
  };

  return {
    /**
     * Goes to the first case listed on the table.
     *
     * This will fail if the table doesn't have any case
     */
    async goToFirstListedCase() {
      await testSubjects.existOrFail('cases-table');
      await testSubjects.existOrFail('case-details-link', {
        timeout: config.get('timeouts.waitFor'),
      });
      await testSubjects.click('case-details-link');
      await testSubjects.existOrFail('case-view-title', {
        timeout: config.get('timeouts.waitFor'),
      });
    },

    async deleteCase(index: number = 0) {
      this.openRowActions(index);
      await testSubjects.existOrFail('cases-bulk-action-delete');
      await testSubjects.click('cases-bulk-action-delete');
      await testSubjects.existOrFail('confirmModalConfirmButton', {
        timeout: config.get('timeouts.waitFor'),
      });
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.existOrFail('euiToastHeader', {
        timeout: config.get('timeouts.waitFor'),
      });
    },

    async bulkDeleteAllCases() {
      await this.selectAllCasesAndOpenBulkActions();

      await testSubjects.existOrFail('cases-bulk-action-delete');
      await testSubjects.click('cases-bulk-action-delete');
      await testSubjects.existOrFail('confirmModalConfirmButton', {
        timeout: config.get('timeouts.waitFor'),
      });
      await testSubjects.click('confirmModalConfirmButton');
    },

    async selectAndDeleteAllCases() {
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('cases-table', { timeout: 20 * 1000 });
      let rows: WebElementWrapper[];
      do {
        await header.waitUntilLoadingHasFinished();
        await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });
        rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);
        if (rows.length > 0) {
          await this.bulkDeleteAllCases();
          // wait for a second
          await new Promise((r) => setTimeout(r, 1000));
          await header.waitUntilLoadingHasFinished();
        }
      } while (rows.length > 0);
    },

    async validateCasesTableHasNthRows(nrRows: number) {
      await retry.tryForTime(3000, async () => {
        const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"');
        expect(rows.length).equal(nrRows);
      });
    },

    async waitForCasesToBeListed() {
      await retry.waitFor('cases to appear on the all cases table', async () => {
        this.refreshTable();
        return await testSubjects.exists('case-details-link');
      });
      await header.waitUntilLoadingHasFinished();
    },

    async waitForCasesToBeDeleted() {
      await retry.waitFor('the cases table to be empty', async () => {
        this.refreshTable();
        const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);
        return rows.length === 0;
      });
    },

    async waitForTableToFinishLoading() {
      await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });
    },

    async getCaseById(caseId: string) {
      const targetCase = await find.allByCssSelector(
        `[data-test-subj*="cases-table-row-${caseId}"`,
        100
      );

      if (!targetCase.length) {
        throw new Error(`Cannot find case with id ${caseId} on table.`);
      }

      return targetCase[0];
    },

    async getCaseByIndex(index: number) {
      const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);

      assertCaseExists(index, rows.length);

      return rows[index] ?? null;
    },

    async filterByTag(tag: string) {
      await common.clickAndValidate(
        'options-filter-popover-button-Tags',
        `options-filter-popover-item-${tag}`
      );

      await testSubjects.click(`options-filter-popover-item-${tag}`);
    },

    async filterByStatus(status: CaseStatuses) {
      await common.clickAndValidate('case-status-filter', `case-status-filter-${status}`);

      await testSubjects.click(`case-status-filter-${status}`);
    },

    async filterBySeverity(severity: CaseSeverityWithAll) {
      await common.clickAndValidate('case-severity-filter', `case-severity-filter-${severity}`);
      await testSubjects.click(`case-severity-filter-${severity}`);
    },

    async filterByAssignee(assignee: string) {
      await this.openAssigneesPopover();

      await casesCommon.setSearchTextInAssigneesPopover(assignee);
      await casesCommon.selectFirstRowInAssigneesPopover();
    },

    async filterByOwner(owner: string) {
      await common.clickAndValidate(
        'options-filter-popover-button-Solution',
        `options-filter-popover-item-${owner}`
      );

      await testSubjects.click(`options-filter-popover-item-${owner}`);
    },

    async refreshTable() {
      await testSubjects.click('all-cases-refresh-link-icon');
    },

    async openRowActions(index: number) {
      const rows = await find.allByCssSelector(
        '[data-test-subj*="case-action-popover-button-"',
        100
      );

      assertCaseExists(index, rows.length);

      const row = rows[index];
      await row.click();
      await find.existsByCssSelector('[data-test-subj*="case-action-popover-"');
    },

    async openAssigneesPopover() {
      await common.clickAndValidate('options-filter-popover-button-assignees', 'euiSelectableList');
    },

    async openBulkActions() {
      await testSubjects.existOrFail('case-table-bulk-actions-link-icon');
      const button = await testSubjects.find('case-table-bulk-actions-link-icon');
      await button.click();
    },

    async selectAllCasesAndOpenBulkActions() {
      await testSubjects.setCheckbox('checkboxSelectAll', 'check');
      await this.openBulkActions();
    },

    async changeStatus(status: CaseStatuses, index: number) {
      await this.openRowActions(index);

      await testSubjects.existOrFail('cases-bulk-action-delete');

      await find.existsByCssSelector('[data-test-subj*="case-action-status-panel-"');
      const statusButton = await find.byCssSelector('[data-test-subj*="case-action-status-panel-"');

      statusButton.click();

      await testSubjects.existOrFail(`cases-bulk-action-status-${status}`);
      await testSubjects.click(`cases-bulk-action-status-${status}`);
    },

    async changeSeverity(severity: CaseSeverity, index: number) {
      await this.openRowActions(index);

      await testSubjects.existOrFail('cases-bulk-action-delete');

      await find.existsByCssSelector('[data-test-subj*="case-action-severity-panel-"');
      const statusButton = await find.byCssSelector(
        '[data-test-subj*="case-action-severity-panel-"'
      );

      statusButton.click();

      await testSubjects.existOrFail(`cases-bulk-action-severity-${severity}`);
      await testSubjects.click(`cases-bulk-action-severity-${severity}`);
    },

    async bulkChangeStatusCases(status: CaseStatuses) {
      await this.selectAllCasesAndOpenBulkActions();

      await testSubjects.existOrFail('case-bulk-action-status');
      await testSubjects.click('case-bulk-action-status');
      await testSubjects.existOrFail(`cases-bulk-action-status-${status}`);
      await testSubjects.click(`cases-bulk-action-status-${status}`);
    },

    async bulkChangeSeverity(severity: CaseSeverity) {
      await this.selectAllCasesAndOpenBulkActions();

      await testSubjects.existOrFail('case-bulk-action-severity');
      await testSubjects.click('case-bulk-action-severity');
      await testSubjects.existOrFail(`cases-bulk-action-severity-${severity}`);
      await testSubjects.click(`cases-bulk-action-severity-${severity}`);
    },

    async bulkEditTags(selectedCases: number[], tagsToClick: string[]) {
      const rows = await find.allByCssSelector('.euiTableRowCellCheckbox');

      for (const caseIndex of selectedCases) {
        assertCaseExists(caseIndex, rows.length);
        rows[caseIndex].click();
      }

      await this.openBulkActions();
      await testSubjects.existOrFail('cases-bulk-action-tags');
      await testSubjects.click('cases-bulk-action-tags');

      await testSubjects.existOrFail('cases-edit-tags-flyout');

      for (const tag of tagsToClick) {
        await testSubjects.existOrFail(`cases-actions-tags-edit-selectable-tag-${tag}`);
        await testSubjects.click(`cases-actions-tags-edit-selectable-tag-${tag}`);
      }

      await testSubjects.click('cases-edit-tags-flyout-submit');
      await testSubjects.missingOrFail('cases-edit-tags-flyout');
    },

    async bulkAddNewTag(selectedCases: number[], tag: string) {
      const rows = await find.allByCssSelector('.euiTableRowCellCheckbox');

      for (const caseIndex of selectedCases) {
        assertCaseExists(caseIndex, rows.length);
        rows[caseIndex].click();
      }

      await this.openBulkActions();
      await testSubjects.existOrFail('cases-bulk-action-tags');
      await testSubjects.click('cases-bulk-action-tags');

      await testSubjects.existOrFail('cases-edit-tags-flyout');
      await testSubjects.existOrFail('cases-actions-tags-edit-selectable-search-input');
      const searchInput = await testSubjects.find(
        'cases-actions-tags-edit-selectable-search-input'
      );

      await testSubjects.existOrFail('cases-actions-tags-edit-selectable-search-input');
      await searchInput.type(tag);

      await testSubjects.existOrFail('cases-actions-tags-edit-selectable-add-new-tag');
      await testSubjects.click('cases-actions-tags-edit-selectable-add-new-tag');

      await testSubjects.click('cases-edit-tags-flyout-submit');
      await testSubjects.missingOrFail('cases-edit-tags-flyout');
    },

    async bulkEditAssignees(selectedCases: number[], assigneesToClick: string[]) {
      const rows = await find.allByCssSelector('.euiTableRowCellCheckbox');

      for (const caseIndex of selectedCases) {
        assertCaseExists(caseIndex, rows.length);
        rows[caseIndex].click();
      }

      await this.openBulkActions();
      await testSubjects.existOrFail('cases-bulk-action-assignees');
      await testSubjects.click('cases-bulk-action-assignees');

      await testSubjects.existOrFail('cases-edit-assignees-flyout');

      for (const assignee of assigneesToClick) {
        await testSubjects.existOrFail(
          `cases-actions-assignees-edit-selectable-assignee-${assignee}`
        );
        await testSubjects.click(`cases-actions-assignees-edit-selectable-assignee-${assignee}`);
      }

      await testSubjects.click('cases-edit-assignees-flyout-submit');
      await testSubjects.missingOrFail('cases-edit-assignees-flyout');
    },

    async bulkAddNewAssignees(selectedCases: number[], searchTerm: string) {
      const rows = await find.allByCssSelector('.euiTableRowCellCheckbox');

      for (const caseIndex of selectedCases) {
        assertCaseExists(caseIndex, rows.length);
        rows[caseIndex].click();
      }

      await this.openBulkActions();
      await testSubjects.existOrFail('cases-bulk-action-assignees');
      await testSubjects.click('cases-bulk-action-assignees');

      await testSubjects.existOrFail('cases-edit-assignees-flyout');

      await testSubjects.existOrFail('cases-actions-assignees-edit-selectable-search-input');
      const searchInput = await testSubjects.find(
        'cases-actions-assignees-edit-selectable-search-input'
      );

      await testSubjects.existOrFail('cases-actions-assignees-edit-selectable-search-input');
      await searchInput.type(searchTerm);

      await casesCommon.selectFirstRowInAssigneesPopover();

      await testSubjects.click('cases-edit-assignees-flyout-submit');
      await testSubjects.missingOrFail('cases-edit-assignees-flyout');
    },

    async selectAndChangeStatusOfAllCases(status: CaseStatuses) {
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('cases-table', { timeout: 20 * 1000 });
      await header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });
      await this.bulkChangeStatusCases(status);
    },

    async selectAndChangeSeverityOfAllCases(severity: CaseSeverity) {
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('cases-table', { timeout: 20 * 1000 });
      await header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('cases-table-loading', { timeout: 5000 });
      await this.bulkChangeSeverity(severity);
    },

    async getCaseTitle(index: number) {
      const titleElement = await (
        await this.getCaseByIndex(index)
      ).findByTestSubject('case-details-link');

      return await titleElement.getVisibleText();
    },
  };
}
