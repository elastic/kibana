/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export function FleetPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);

  const createDataTableObject = (tableTestSubject: string) => ({
    getElement() {
      return testSubjects.find(tableTestSubject);
    },

    // async getHeaders() {
    //   const element = await this.getElement();
    //   return await element.findAllByCssSelector('.euiDataGridHeader');
    // },

    async getColumnIndex(columnName: string) {
      const element = await this.getElement();
      const columnIndexAttr = await (
        await element.findByCssSelector(`[data-gridcell-column-id="${columnName}"]`)
      ).getAttribute('data-gridcell-column-index');
      expect(columnIndexAttr).to.not.be(null);
      const columnIndex = parseInt(columnIndexAttr ?? '-1', 10);
      expect(columnIndex).to.be.greaterThan(-1);
      return columnIndex;
    },

    // async getColumnHeaderCell(columnName: string) {
    //   const headers = await this.getHeaders();
    //   const headerIndexes = await Promise.all(headers.map((header) => header.getVisibleText()));
    //   const columnIndex = headerIndexes.findIndex((i) => i === columnName);
    //   return headers[columnIndex];
    // },

    // async getRowsCount() {
    //   const element = await this.getElement();
    //   const rows = await element.findAllByCssSelector('.euiDataGridRow');
    //   return rows.length;
    // },

    // async getFindingsCount(type: 'passed' | 'failed') {
    //   const element = await this.getElement();
    //   const items = await element.findAllByCssSelector(`span[data-test-subj="${type}_finding"]`);
    //   return items.length;
    // },

    async getRowIndexForValue(columnName: string, value: string) {
      const values = await this.getColumnValues(columnName);
      const rowIndex = values.indexOf(value);
      expect(rowIndex).to.be.greaterThan(-1);
      return rowIndex;
    },

    // async getFilterElementButton(rowIndex: number, columnIndex: number | string, negated = false) {
    //   const tableElement = await this.getElement();
    //   const button = negated ? 'filterOutButton' : 'filterForButton';
    //   const selector = `[data-gridcell-row-index="${rowIndex}"][data-gridcell-column-index="${columnIndex}"] button[data-test-subj="${button}"]`;
    //   return tableElement.findByCssSelector(selector);
    // },

    // async addCellFilter(columnName: string, cellValue: string, negated = false) {
    //   const columnIndex = await this.getColumnIndex(columnName);
    //   const rowIndex = await this.getRowIndexForValue(columnName, cellValue);
    //   const filterElement = await this.getFilterElementButton(rowIndex, columnIndex, negated);
    //   await filterElement.click();
    // },

    async getColumnValues(columnName: string) {
      const tableElement = await this.getElement();
      const selector = `.euiDataGridRowCell[data-gridcell-column-id="${columnName}"]`;
      const columnCells = await tableElement.findAllByCssSelector(selector);

      return await Promise.all(columnCells.map((cell) => cell.getVisibleText()));
    },

    // async hasColumnValue(columnName: string, value: string) {
    //   const values = await this.getColumnValues(columnName);
    //   return values.includes(value);
    // },

    // async toggleColumnSort(columnName: string, direction: 'asc' | 'desc') {
    //   const currentSorting = await testSubjects.find('dataGridColumnSortingButton');
    //   const currentSortingText = await currentSorting.getVisibleText();
    //   await currentSorting.click();

    //   if (currentSortingText !== 'Sort fields') {
    //     const clearSortButton = await testSubjects.find('dataGridColumnSortingClearButton');
    //     await clearSortButton.click();
    //   }

    //   const selectSortFieldButton = await testSubjects.find('dataGridColumnSortingSelectionButton');
    //   await selectSortFieldButton.click();

    //   const sortField = await testSubjects.find(
    //     `dataGridColumnSortingPopoverColumnSelection-${columnName}`
    //   );
    //   await sortField.click();

    //   const sortDirection = await testSubjects.find(
    //     `euiDataGridColumnSorting-sortColumn-${columnName}-${direction}`
    //   );
    //   await sortDirection.click();
    //   await currentSorting.click();
    // },

    // async openFlyoutAt(rowIndex: number) {
    //   const table = await this.getElement();
    //   const flyoutButton = await table.findAllByTestSubject('docTableExpandToggleColumn');
    //   await flyoutButton[rowIndex].click();
    // },

    // async toggleEditDataViewFieldsOption(columnId: string) {
    //   const element = await this.getElement();
    //   const column = await element.findByCssSelector(`[data-gridcell-column-id="${columnId}"]`);
    //   const button = await column.findByCssSelector('.euiDataGridHeaderCell__button');
    //   return await button.click();
    // },
  });

  const navigateToFleetAgentsPage = async (space?: string) => {
    const options = space
      ? {
          basePath: `/s/${space}`,
          shouldUseHashForSubUrl: false,
        }
      : {
          shouldUseHashForSubUrl: false,
        };

    await PageObjects.common.navigateToUrl(
      'fleet', // Defined in Security Solution plugin
      'fleet/agents',
      options
    );
  };

  return {
    navigateToFleetAgentsPage,
    createDataTableObject,
  };
}
