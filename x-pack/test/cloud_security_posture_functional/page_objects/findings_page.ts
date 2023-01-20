/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

// Defined in CSP plugin
const FINDINGS_INDEX = 'logs-cloud_security_posture.findings_latest-default';

export function FindingsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const es = getService('es');
  const supertest = getService('supertest');
  const log = getService('log');

  /**
   * required before indexing findings
   */
  const waitForPluginInitialized = (): Promise<void> =>
    retry.try(async () => {
      log.debug('Check CSP plugin is initialized');
      const response = await supertest
        .get('/internal/cloud_security_posture/status?check=init')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    remove: () => es.indices.delete({ index: FINDINGS_INDEX, ignore_unavailable: true }),
    add: async <T>(findingsMock: T[]) => {
      await waitForPluginInitialized();
      await Promise.all(
        findingsMock.map((finding) =>
          es.index({
            index: FINDINGS_INDEX,
            body: finding,
          })
        )
      );
    },
  };

  const distributionBar = {
    filterBy: async (type: 'passed' | 'failed') =>
      testSubjects.click(type === 'failed' ? 'distribution_bar_failed' : 'distribution_bar_passed'),
  };

  const table = {
    getElement: () => testSubjects.find('findings_table'),

    getDropDownGroupBy: () => testSubjects.find('comboBoxInput'),

    getDropDownPopUp: () => testSubjects.find('comboBoxOptionsList '),

    getElementRow: (id: string, section: string) =>
      testSubjects.find(`findings_resource_table_row_${id}/${section}`),

    getHeaders: async () => {
      const element = await table.getElement();
      return await element.findAllByCssSelector('thead tr :is(th,td)');
    },

    getColumnIndex: async (columnName: string) => {
      const headers = await table.getHeaders();
      const texts = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = texts.findIndex((i) => i === columnName);
      expect(columnIndex).to.be.greaterThan(-1);
      return columnIndex + 1;
    },

    getColumnHeaderCell: async (columnName: string) => {
      const headers = await table.getHeaders();
      const headerIndexes = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = headerIndexes.findIndex((i) => i === columnName);
      return headers[columnIndex];
    },

    getRowsCount: async () => {
      const element = await table.getElement();
      const rows = await element.findAllByCssSelector('tbody tr');
      return rows.length;
    },

    getFindingsCount: async (type: 'passed' | 'failed') => {
      const element = await table.getElement();
      const items = await element.findAllByCssSelector(`span[data-test-subj="${type}_finding"]`);
      return items.length;
    },

    getRowIndexForValue: async (columnName: string, value: string) => {
      const values = await table.getColumnValues(columnName);
      const rowIndex = values.indexOf(value);
      expect(rowIndex).to.be.greaterThan(-1);
      return rowIndex + 1;
    },

    getFilterElementButton: async (rowIndex: number, columnIndex: number, negated = false) => {
      const tableElement = await table.getElement();
      const button = negated
        ? 'findings_table_cell_add_negated_filter'
        : 'findings_table_cell_add_filter';
      const selector = `tbody tr:nth-child(${rowIndex}) td:nth-child(${columnIndex}) button[data-test-subj="${button}"]`;
      return tableElement.findByCssSelector(selector);
    },

    addCellFilter: async (columnName: string, cellValue: string, negated = false) => {
      const columnIndex = await table.getColumnIndex(columnName);
      const rowIndex = await table.getRowIndexForValue(columnName, cellValue);
      const filterElement = await table.getFilterElementButton(rowIndex, columnIndex, negated);
      await filterElement.click();
    },

    getColumnValues: async (columnName: string) => {
      const elementsWithNoFilterCell = ['CIS Section', '@timestamp'];
      const tableElement = await table.getElement();
      const columnIndex = await table.getColumnIndex(columnName);
      const selector = elementsWithNoFilterCell.includes(columnName)
        ? `tbody tr td:nth-child(${columnIndex})`
        : `tbody tr td:nth-child(${columnIndex}) div[data-test-subj="filter_cell_value"]`;
      const columnCells = await tableElement.findAllByCssSelector(selector);

      return await Promise.all(columnCells.map((cell) => cell.getVisibleText()));
    },

    hasColumnValue: async (columnName: string, value: string) => {
      const values = await table.getColumnValues(columnName);
      return values.includes(value);
    },

    toggleColumnSort: async (columnName: string, direction: 'asc' | 'desc') => {
      const element = await table.getColumnHeaderCell(columnName);
      const currentSort = await element.getAttribute('aria-sort');
      if (currentSort === 'none') {
        // a click is needed to focus on Eui column header
        await element.click();

        // default is ascending
        if (direction === 'desc') {
          const nonStaleElement = await table.getColumnHeaderCell(columnName);
          await nonStaleElement.click();
        }
      }
      if (
        (currentSort === 'ascending' && direction === 'desc') ||
        (currentSort === 'descending' && direction === 'asc')
      ) {
        // Without getting the element again, the click throws an error (stale element reference)
        const nonStaleElement = await table.getColumnHeaderCell(columnName);
        await nonStaleElement.click();
      }
    },

    toggleDropDownModal: async () => {
      const dropDown = await table.getDropDownGroupBy();
      await dropDown.click();
    },

    selectGroupBy: async (groupName: string) => {
      const dropDownPopUpBox = await table.getDropDownPopUp();
      const selector = `button[title="${groupName}"]`;
      const dropDownSelect = await dropDownPopUpBox.findByCssSelector(selector);
      await dropDownSelect.click();
    },

    clickOnRowValue: async (value: string, section: string) => {
      const findingsTable = await table.getElementRow(value, section);
      const selector = `a[title="${value}"]`;
      const rowValueSelect = await findingsTable.findByCssSelector(selector);
      await rowValueSelect.click();
    },
  };

  const tableGroupBy = {
    getElementGroupedBy: () => testSubjects.find('pageContainer'),

    getHeaders: async () => {
      const element = await tableGroupBy.getElementGroupedBy();
      return await element.findAllByCssSelector('thead tr :is(th,td)');
    },

    getColumnIndex: async (columnName: string) => {
      const headers = await tableGroupBy.getHeaders();
      const texts = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = texts.findIndex((i) => i === columnName);
      expect(columnIndex).to.be.greaterThan(-1);
      return columnIndex + 1;
    },

    getColumnValues: async (columnName: string) => {
      const elementsWithNoFilterCell = ['CIS Section', '@timestamp'];
      const tableElement = await tableGroupBy.getElementGroupedBy();
      const columnIndex = await tableGroupBy.getColumnIndex(columnName);
      const selector = elementsWithNoFilterCell.includes(columnName)
        ? `tbody tr td:nth-child(${columnIndex})`
        : `tbody tr td:nth-child(${columnIndex}) div[data-test-subj="filter_cell_value"]`;
      const columnCells = await tableElement.findAllByCssSelector(selector);

      return await Promise.all(columnCells.map((cell) => cell.getVisibleText()));
    },

    hasColumnValue: async (columnName: string, value: string) => {
      const values = await tableGroupBy.getColumnValues(columnName);
      return values.includes(value);
    },

    clickBasedOnText: async (value: string) => {
      const pageContainer = await tableGroupBy.getElementGroupedBy();
      const selector = `//*[contains(text(),'${value}')]`;
      const clickTarget = await pageContainer.findByXpath(selector);
      await clickTarget.click();
    },
  };

  const navigateToFindingsPage = async () => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      'cloud_security_posture/findings',
      { shouldUseHashForSubUrl: false }
    );
  };

  return {
    navigateToFindingsPage,
    table,
    tableGroupBy,
    index,
    distributionBar,
  };
}
