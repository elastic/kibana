/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

type TransformRowActionName = 'Clone' | 'Delete' | 'Edit' | 'Start' | 'Stop' | 'Discover';

export function TransformTableProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return new (class TransformTable {
    public async parseTransformTable() {
      const table = await testSubjects.find('~transformListTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~transformListRow').toArray()) {
        const $tr = $(tr);

        rows.push({
          id: $tr
            .findTestSubject('transformListColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('transformListColumnDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          status: $tr
            .findTestSubject('transformListColumnStatus')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          mode: $tr
            .findTestSubject('transformListColumnMode')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          progress: $tr
            .findTestSubject('transformListColumnProgress')
            .findTestSubject('transformListProgress')
            .attr('value'),
        });
      }

      return rows;
    }

    async parseEuiDataGrid(tableSubj: string) {
      const table = await testSubjects.find(`~${tableSubj}`);
      const $ = await table.parseDomContent();
      const rows = [];

      // For each row, get the content of each cell and
      // add its values as an array to each row.
      for (const tr of $.findTestSubjects(`~dataGridRow`).toArray()) {
        rows.push(
          $(tr)
            .find('.euiDataGridRowCell__truncate')
            .toArray()
            .map((cell) => $(cell).text().trim())
        );
      }

      return rows;
    }

    async assertEuiDataGridColumnValues(
      tableSubj: string,
      column: number,
      expectedColumnValues: string[]
    ) {
      await retry.tryForTime(2000, async () => {
        // get a 2D array of rows and cell values
        const rows = await this.parseEuiDataGrid(tableSubj);

        // reduce the rows data to an array of unique values in the specified column
        const uniqueColumnValues = rows
          .map((row) => row[column])
          .flat()
          .filter((v, i, a) => a.indexOf(v) === i);

        uniqueColumnValues.sort();

        // check if the returned unique value matches the supplied filter value
        expect(uniqueColumnValues).to.eql(
          expectedColumnValues,
          `Expected '${tableSubj}' column values to be '${expectedColumnValues}' (got '${uniqueColumnValues}')`
        );
      });
    }

    public async waitForRefreshButtonLoaded() {
      await testSubjects.existOrFail('~transformRefreshTransformListButton', {
        timeout: 10 * 1000,
      });
      await testSubjects.existOrFail('transformRefreshTransformListButton loaded', {
        timeout: 30 * 1000,
      });
    }

    public async refreshTransformList() {
      await this.waitForRefreshButtonLoaded();
      await testSubjects.click('~transformRefreshTransformListButton');
      await this.waitForRefreshButtonLoaded();
      await this.waitForTransformsToLoad();
    }

    public async waitForTransformsToLoad() {
      await testSubjects.existOrFail('~transformListTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformListTable loaded', { timeout: 30 * 1000 });
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForTransformsToLoad();
      const tableListContainer = await testSubjects.find('transformListTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);

      const rows = await this.parseTransformTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered Transform table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public async clearSearchString(expectedRowCount: number = 1) {
      await this.waitForTransformsToLoad();
      const tableListContainer = await testSubjects.find('transformListTableContainer');
      const searchBarInput = await tableListContainer.findByClassName('euiFieldSearch');
      await searchBarInput.clearValueWithKeyboard();
      const rows = await this.parseTransformTable();
      expect(rows).to.have.length(
        expectedRowCount,
        `Transform table should have ${expectedRowCount} row(s) after clearing search' (got '${rows.length}')`
      );
    }

    public async assertTransformRowFields(transformId: string, expectedRow: object) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];
        expect(transformRow).to.eql(
          expectedRow,
          `Expected transform row to be '${JSON.stringify(expectedRow)}' (got '${JSON.stringify(
            transformRow
          )}')`
        );
      });
    }

    public async assertTransformRowProgressGreaterThan(
      transformId: string,
      expectedProgress: number
    ) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];
        expect(transformRow.progress).to.greaterThan(
          0,
          `Expected transform row progress to be greater than '${expectedProgress}' (got '${transformRow.progress}')`
        );
      });
    }

    public async assertTransformRowStatusNotEql(transformId: string, status: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.refreshTransformList();
        const rows = await this.parseTransformTable();
        const transformRow = rows.filter((row) => row.id === transformId)[0];
        expect(transformRow.status).to.not.eql(
          status,
          `Expected transform row status to not be '${status}' (got '${transformRow.status}')`
        );
      });
    }

    public async assertTransformExpandedRow() {
      await testSubjects.click('transformListRowDetailsToggle');

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Walk through the rest of the tabs and check if the corresponding content shows up
      await testSubjects.existOrFail('transformJsonTab');
      await testSubjects.click('transformJsonTab');
      await testSubjects.existOrFail('~transformJsonTabContent');

      await testSubjects.existOrFail('transformMessagesTab');
      await testSubjects.click('transformMessagesTab');
      await testSubjects.existOrFail('~transformMessagesTabContent');

      await testSubjects.existOrFail('transformPreviewTab');
      await testSubjects.click('transformPreviewTab');
      await testSubjects.existOrFail('~transformPivotPreview');
    }

    public async assertTransformExpandedRowMessages(expectedText: string) {
      await testSubjects.click('transformListRowDetailsToggle');

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Click on the messages tab and assert the messages
      await testSubjects.existOrFail('transformMessagesTab');
      await testSubjects.click('transformMessagesTab');
      await testSubjects.existOrFail('~transformMessagesTabContent');
      await retry.tryForTime(30 * 1000, async () => {
        const actualText = await testSubjects.getVisibleText('~transformMessagesTabContent');
        expect(actualText.toLowerCase()).to.contain(
          expectedText.toLowerCase(),
          `Expected transform messages text to include '${expectedText}'`
        );
      });
    }

    public rowSelector(transformId: string, subSelector?: string) {
      const row = `~transformListTable > ~row-${transformId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async assertTransformRowActions(transformId: string, isTransformRunning = false) {
      await testSubjects.click(this.rowSelector(transformId, 'euiCollapsedItemActionsButton'));

      await testSubjects.existOrFail('transformActionClone');
      await testSubjects.existOrFail('transformActionDelete');
      await testSubjects.existOrFail('transformActionDiscover');
      await testSubjects.existOrFail('transformActionEdit');

      if (isTransformRunning) {
        await testSubjects.missingOrFail('transformActionStart');
        await testSubjects.existOrFail('transformActionStop');
      } else {
        await testSubjects.existOrFail('transformActionStart');
        await testSubjects.missingOrFail('transformActionStop');
      }
    }

    public async assertTransformRowActionEnabled(
      transformId: string,
      action: TransformRowActionName,
      expectedValue: boolean
    ) {
      const selector = `transformAction${action}`;
      await retry.tryForTime(60 * 1000, async () => {
        await this.refreshTransformList();

        await browser.pressKeys(browser.keys.ESCAPE);
        await testSubjects.click(this.rowSelector(transformId, 'euiCollapsedItemActionsButton'));

        await testSubjects.existOrFail(selector);
        const isEnabled = await testSubjects.isEnabled(selector);
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected '${action}' button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
            isEnabled ? 'enabled' : 'disabled'
          }')`
        );
      });
    }

    public async clickTransformRowActionWithRetry(
      transformId: string,
      action: TransformRowActionName
    ) {
      await retry.tryForTime(30 * 1000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        await testSubjects.click(this.rowSelector(transformId, 'euiCollapsedItemActionsButton'));
        await testSubjects.existOrFail(`transformAction${action}`);
        await testSubjects.click(`transformAction${action}`);
        await testSubjects.missingOrFail(`transformAction${action}`);
      });
    }

    public async clickTransformRowAction(action: TransformRowActionName) {
      await testSubjects.click(`transformAction${action}`);
    }

    public async waitForTransformsExpandedRowPreviewTabToLoad() {
      await testSubjects.existOrFail('~transformPivotPreview', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('transformPivotPreview loaded', { timeout: 30 * 1000 });
    }

    public async assertTransformsExpandedRowPreviewColumnValues(column: number, values: string[]) {
      await this.waitForTransformsExpandedRowPreviewTabToLoad();
      await this.assertEuiDataGridColumnValues('transformPivotPreview', column, values);
    }

    public async assertTransformDeleteModalExists() {
      await testSubjects.existOrFail('transformDeleteModal', { timeout: 60 * 1000 });
    }

    public async assertTransformDeleteModalNotExists() {
      await testSubjects.missingOrFail('transformDeleteModal', { timeout: 60 * 1000 });
    }

    public async assertTransformStartModalExists() {
      await testSubjects.existOrFail('transformStartModal', { timeout: 60 * 1000 });
    }

    public async assertTransformStartModalNotExists() {
      await testSubjects.missingOrFail('transformStartModal', { timeout: 60 * 1000 });
    }

    public async confirmDeleteTransform() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertTransformDeleteModalExists();
        await testSubjects.click('transformDeleteModal > confirmModalConfirmButton');
        await this.assertTransformDeleteModalNotExists();
      });
    }

    public async assertTransformRowNotExists(transformId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        // If after deletion, and there's no transform left
        const noTransformsFoundMessageExists = await testSubjects.exists(
          'transformNoTransformsFound'
        );

        if (noTransformsFoundMessageExists) {
          return true;
        } else {
          // Checks that the tranform was deleted
          await this.filterWithSearchString(transformId, 0);
        }
      });
    }

    public async confirmStartTransform() {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertTransformStartModalExists();
        await testSubjects.click('transformStartModal > confirmModalConfirmButton');
        await this.assertTransformStartModalNotExists();
      });
    }
  })();
}
