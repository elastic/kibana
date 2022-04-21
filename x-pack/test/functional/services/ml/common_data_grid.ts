/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { chunk } from 'lodash';
import type { ProvidedType } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { asyncForEach } from '../../apps/ml/settings/common';

export interface SetValueOptions {
  clearWithKeyboard?: boolean;
  enforceDataTestSubj?: boolean;
  typeCharByChar?: boolean;
}

export type MlCommonDataGrid = ProvidedType<typeof MachineLearningCommonDataGridProvider>;

export function MachineLearningCommonDataGridProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const find = getService('find');

  return {
    dataGridSelector(tableSubj: string, subSelector?: string) {
      return `~${tableSubj} > ${subSelector}`;
    },

    async parseEuiDataGrid(tableSubj: string, maxColumnsToParse: number) {
      const table = await testSubjects.find(`~${tableSubj}`);
      const $ = await table.parseDomContent();

      // Get the content of each cell and divide them up into rows.
      // Virtualized cells outside the view area are not present in the DOM until they
      // are scroilled into view, so we're limiting the number of parsed columns.
      // To determine row and column of a cell, we're utilizing the screen reader
      // help text, which enumerates the rows and columns 1-based.
      const cells = $.findTestSubjects('dataGridRowCell')
        .toArray()
        .map((cell) => {
          const cellText = $(cell).text();
          const pattern = /^(.*)Row: (\d+); Column: (\d+)$/;
          const matches = cellText.match(pattern);
          expect(matches).to.not.eql(null, `Cell text should match pattern '${pattern}'`);
          return { text: matches![1], row: Number(matches![2]), column: Number(matches![3]) };
        })
        .filter((cell) =>
          maxColumnsToParse !== undefined ? cell?.column <= maxColumnsToParse : false
        )
        .sort(function (a, b) {
          return a.row - b.row || a.column - b.column;
        })
        .map((cell) => cell.text);

      const rows = maxColumnsToParse !== undefined ? chunk(cells, maxColumnsToParse) : cells;
      return rows;
    },

    async getDataGridCells(tableSubj: string) {
      return (await testSubjects.find(tableSubj)).findAllByTestSubject('dataGridRowCell');
    },

    async assertEuiDataGridNotEmpty(tableSubj: string) {
      const dataGridCells = await this.getDataGridCells(tableSubj);
      expect(dataGridCells.length).to.be.greaterThan(
        0,
        `EuiDataGrid '${tableSubj}' should have at least one cell (got '${dataGridCells.length}')`
      );
    },

    async assertEuiDataGridEmpty(tableSubj: string) {
      const dataGridCells = await this.getDataGridCells(tableSubj);
      expect(dataGridCells.length).to.eql(
        0,
        `EuiDataGrid '${tableSubj}' should be empty (got '${dataGridCells.length} cells')`
      );
    },

    async getEuiDataGridColumnUniqueValues(tableSubj: string, column: number) {
      // get a 2D array of rows and cell values
      // only parse columns up to the one we want to assert
      const rows = await this.parseEuiDataGrid(tableSubj, column + 1);

      // reduce the rows data to an array of unique values in the specified column
      const uniqueColumnValues = rows
        .map((row) => row[column])
        .flat()
        .filter((v, i, a) => a.indexOf(v) === i);
      return uniqueColumnValues;
    },

    async assertEuiDataGridColumnValues(
      tableSubj: string,
      column: number,
      expectedColumnValues: string[]
    ) {
      await retry.tryForTime(20 * 1000, async () => {
        const uniqueColumnValues = await this.getEuiDataGridColumnUniqueValues(tableSubj, column);

        uniqueColumnValues.sort();
        // check if the returned unique value matches the supplied filter value
        expect(uniqueColumnValues).to.eql(
          expectedColumnValues,
          `Unique EuiDataGrid '${tableSubj}' column values should be '${expectedColumnValues.join()}' (got ${uniqueColumnValues.join()})`
        );
      });
    },

    async assertEuiDataGridColumnValuesNotEmpty(tableSubj: string, column: number) {
      await retry.tryForTime(20 * 1000, async () => {
        const uniqueColumnValues = await this.getEuiDataGridColumnUniqueValues(tableSubj, column);
        uniqueColumnValues.forEach((value) => {
          // check if the returned unique value is not empty
          expect(value).to.not.eql('');
        });
      });
    },

    async assertColumnSelectPopoverOpenState(tableSubj: string, expectedState: boolean) {
      const popoverSelector = this.dataGridSelector(tableSubj, 'dataGridColumnSelectorPopover');

      if (expectedState === true) {
        await testSubjects.existOrFail(popoverSelector, {
          timeout: 5 * 1000,
        });
      } else {
        await testSubjects.missingOrFail(popoverSelector, {
          timeout: 5 * 1000,
        });
      }
    },

    async toggleColumnSelectPopoverState(tableSubj: string, state: boolean) {
      await retry.tryForTime(15 * 1000, async () => {
        const popoverIsOpen = await testSubjects.exists(
          this.dataGridSelector(tableSubj, '~dataGridColumnSelectorPopoverButton')
        );
        if (popoverIsOpen !== state) {
          await testSubjects.click(
            this.dataGridSelector(tableSubj, '~dataGridColumnSelectorButton')
          );
        }
        await this.assertColumnSelectPopoverOpenState(tableSubj, state);
      });
    },

    async assertColumnSelectorsSwitchState(expectedState: boolean) {
      await retry.tryForTime(5 * 1000, async () => {
        const visibilityToggles = await (
          await find.byClassName('euiDataGrid__controlScroll')
        ).findAllByCssSelector('[role="switch"]');

        await asyncForEach(visibilityToggles, async (toggle) => {
          const checked = (await toggle.getAttribute('aria-checked')) === 'true';
          expect(checked).to.eql(
            expectedState,
            `Expected column select switch button's checked state to be ${expectedState} (got ${checked})`
          );
        });
      });
    },

    async hideAllColumns(tableSubj: string) {
      await this.toggleColumnSelectPopoverState(tableSubj, true);
      await testSubjects.click('dataGridColumnSelectorHideAllButton');
      await this.assertColumnSelectorsSwitchState(false);
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async showAllColumns(tableSubj: string) {
      await this.toggleColumnSelectPopoverState(tableSubj, true);
      await testSubjects.click('dataGridColumnSelectorShowAllButton');
      await this.assertColumnSelectorsSwitchState(true);
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async assertColumnSortPopoverOpenState(tableSubj: string, expectedOpenState: boolean) {
      const popoverSelector = this.dataGridSelector(tableSubj, 'dataGridColumnSortingPopover');

      if (expectedOpenState === true) {
        await testSubjects.existOrFail(popoverSelector, {
          timeout: 5 * 1000,
        });
      } else {
        await testSubjects.missingOrFail(popoverSelector, {
          timeout: 5 * 1000,
        });
      }
    },

    async toggleColumnSortPopoverState(tableSubj: string, expectedState: boolean) {
      await retry.tryForTime(15 * 1000, async () => {
        const popoverIsOpen = await testSubjects.exists('dataGridColumnSortingSelectionButton');
        if (popoverIsOpen !== expectedState) {
          await testSubjects.click(this.dataGridSelector(tableSubj, 'dataGridColumnSortingButton'));
        }
        await this.assertColumnSortPopoverOpenState(tableSubj, expectedState);
      });
    },

    async setColumnToSortBy(tableSubj: string, columnId: string, sortDirection: 'asc' | 'desc') {
      await this.toggleColumnSortPopoverState(tableSubj, true);
      await retry.tryForTime(15 * 1000, async () => {
        // Pick fields to sort by
        await testSubjects.existOrFail('dataGridColumnSortingSelectionButton');
        await testSubjects.click('dataGridColumnSortingSelectionButton');
        await testSubjects.existOrFail(`dataGridColumnSortingPopoverColumnSelection-${columnId}`);
        await testSubjects.click(`dataGridColumnSortingPopoverColumnSelection-${columnId}`);
        await testSubjects.existOrFail(`euiDataGridColumnSorting-sortColumn-${columnId}`);
        // Click sorting direction
        await testSubjects.click(
          `euiDataGridColumnSorting-sortColumn-${columnId}-${sortDirection}`
        );
        // Close popover
        await browser.pressKeys(browser.keys.ESCAPE);
      });
    },
  };
}
