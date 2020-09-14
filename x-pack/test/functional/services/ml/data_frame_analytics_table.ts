/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsTableProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return new (class AnalyticsTable {
    public async parseAnalyticsTable() {
      const table = await testSubjects.find('~mlAnalyticsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlAnalyticsTableRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          id: $tr
            .findTestSubject('mlAnalyticsTableColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('mlAnalyticsTableColumnJobDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          sourceIndex: $tr
            .findTestSubject('mlAnalyticsTableColumnSourceIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          destinationIndex: $tr
            .findTestSubject('mlAnalyticsTableColumnDestIndex')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          type: $tr
            .findTestSubject('mlAnalyticsTableColumnType')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          status: $tr
            .findTestSubject('mlAnalyticsTableColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          progress: $tr
            .findTestSubject('mlAnalyticsTableColumnProgress')
            .findTestSubject('mlAnalyticsTableProgress')
            .attr('value'),
        });
      }

      return rows;
    }

    public rowSelector(analyticsId: string, subSelector?: string) {
      const row = `~mlAnalyticsTable > ~row-${analyticsId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async waitForRefreshButtonLoaded() {
      await testSubjects.existOrFail('~mlAnalyticsRefreshListButton', { timeout: 10 * 1000 });
      await testSubjects.existOrFail('mlAnalyticsRefreshListButton loaded', { timeout: 30 * 1000 });
    }

    public async refreshAnalyticsTable() {
      await this.waitForRefreshButtonLoaded();
      await testSubjects.click('~mlAnalyticsRefreshListButton');
      await this.waitForRefreshButtonLoaded();
      await this.waitForAnalyticsToLoad();
    }

    public async waitForAnalyticsToLoad() {
      await testSubjects.existOrFail('~mlAnalyticsTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlAnalyticsTable loaded', { timeout: 30 * 1000 });
    }

    async getAnalyticsSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('mlAnalyticsTableContainer');
      return await tableListContainer.findByClassName('euiFieldSearch');
    }

    public async assertJobRowViewButtonExists(analyticsId: string) {
      await testSubjects.existOrFail(this.rowSelector(analyticsId, 'mlAnalyticsJobViewButton'));
    }

    public async assertJobRowViewButtonEnabled(analyticsId: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(analyticsId, 'mlAnalyticsJobViewButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected data frame analytics row "view results" button for job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async openResultsView(analyticsId: string) {
      await this.assertJobRowViewButtonExists(analyticsId);
      await testSubjects.click(this.rowSelector(analyticsId, 'mlAnalyticsJobViewButton'));
      await testSubjects.existOrFail('mlPageDataFrameAnalyticsExploration', { timeout: 20 * 1000 });
    }

    public async assertAnalyticsSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getAnalyticsSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Analytics search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForAnalyticsToLoad();
      const searchBarInput = await this.getAnalyticsSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await this.assertAnalyticsSearchInputValue(filter);

      const rows = await this.parseAnalyticsTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered DFA job table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public async assertAnalyticsRowFields(analyticsId: string, expectedRow: object) {
      await this.refreshAnalyticsTable();
      const rows = await this.parseAnalyticsTable();
      const analyticsRow = rows.filter((row) => row.id === analyticsId)[0];
      expect(analyticsRow).to.eql(
        expectedRow,
        `Expected analytics row to be '${JSON.stringify(expectedRow)}' (got '${JSON.stringify(
          analyticsRow
        )}')`
      );
    }

    public async assertJowRowActionsMenuButtonEnabled(analyticsId: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        this.rowSelector(analyticsId, 'euiCollapsedItemActionsButton')
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected row action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async ensureJobActionsMenuOpen(analyticsId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if (!(await testSubjects.exists('mlAnalyticsJobDeleteButton'))) {
          await testSubjects.click(this.rowSelector(analyticsId, 'euiCollapsedItemActionsButton'));
          await testSubjects.existOrFail('mlAnalyticsJobDeleteButton', { timeout: 5000 });
        }
      });
    }

    public async ensureJobActionsMenuClosed(analyticsId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        if (await testSubjects.exists('mlAnalyticsJobDeleteButton')) {
          await testSubjects.click(this.rowSelector(analyticsId, 'euiCollapsedItemActionsButton'));
          await testSubjects.missingOrFail('mlAnalyticsJobDeleteButton', { timeout: 5000 });
        }
      });
    }

    public async assertJobActionViewButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const actionMenuViewButton = await find.byCssSelector(
        '[data-test-subj="mlAnalyticsJobViewButton"][class="euiContextMenuItem"]'
      );
      const isEnabled = await actionMenuViewButton.isEnabled();
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "view" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionStartButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobStartButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "start" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionEditButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobEditButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "edit" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionCloneButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobCloneButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "clone" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertJobActionDeleteButtonEnabled(analyticsId: string, expectedValue: boolean) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsJobDeleteButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "delete" action menu button for DFA job '${analyticsId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async openEditFlyout(analyticsId: string) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      await testSubjects.click('mlAnalyticsJobEditButton');
      await testSubjects.existOrFail('mlAnalyticsEditFlyout', { timeout: 5000 });
    }

    public async cloneJob(analyticsId: string) {
      await this.ensureJobActionsMenuOpen(analyticsId);
      await testSubjects.click(`mlAnalyticsJobCloneButton`);
      await testSubjects.existOrFail('mlAnalyticsCreationContainer');
    }
  })();
}
