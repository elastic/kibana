/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common';
import { CaseSeverityWithAll } from '@kbn/cases-plugin/common/ui';
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

    async deleteFirstListedCase() {
      await testSubjects.existOrFail('action-delete', {
        timeout: config.get('timeouts.waitFor'),
      });
      await testSubjects.click('action-delete');
      await testSubjects.existOrFail('confirmModalConfirmButton', {
        timeout: config.get('timeouts.waitFor'),
      });
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.existOrFail('euiToastHeader', {
        timeout: config.get('timeouts.waitFor'),
      });
    },

    async bulkDeleteAllCases() {
      await testSubjects.setCheckbox('checkboxSelectAll', 'check');
      const button = await find.byCssSelector('[aria-label="Bulk actions"]');
      await button.click();
      await testSubjects.click('cases-bulk-delete-button');
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

    async getCaseFromTable(index: number) {
      const rows = await find.allByCssSelector('[data-test-subj*="cases-table-row-"', 100);

      if (index > rows.length) {
        throw new Error('Cannot get case from table. Index is greater than the length of all rows');
      }

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
      await common.clickAndValidate('options-filter-popover-button-assignees', 'euiSelectableList');

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
      await testSubjects.click('all-cases-refresh');
    },
  };
}
