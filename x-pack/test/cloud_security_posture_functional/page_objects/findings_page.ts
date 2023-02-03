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

  const latestFindingsTable = {
    getElement: (selector: string) => testSubjects.find(selector),

    getFindingsContainer: () => testSubjects.find('findings_container'),

    getHeaders: async (selector: string) => {
      const element = await latestFindingsTable.getElement(selector);
      return await element.findAllByCssSelector('thead tr :is(th,td)');
    },

    getColumnIndex: async (columnName: string) => {
      const headers = await latestFindingsTable.getHeaders('findings_table');
      const texts = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = texts.findIndex((i) => i === columnName);
      expect(columnIndex).to.be.greaterThan(-1);
      return columnIndex + 1;
    },

    getColumnHeaderCell: async (columnName: string) => {
      const headers = await latestFindingsTable.getHeaders('findings_table');
      const headerIndexes = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = headerIndexes.findIndex((i) => i === columnName);
      return headers[columnIndex];
    },

    getRowsCount: async () => {
      const element = await latestFindingsTable.getElement('findings_table');
      const rows = await element.findAllByCssSelector('tbody tr');
      return rows.length;
    },

    getFindingsCount: async (type: 'passed' | 'failed') => {
      const element = await latestFindingsTable.getElement('findings_table');
      const items = await element.findAllByCssSelector(`span[data-test-subj="${type}_finding"]`);
      return items.length;
    },

    getRowIndexForValue: async (columnName: string, value: string) => {
      const values = await latestFindingsTable.getColumnValues(columnName);
      const rowIndex = values.indexOf(value);
      expect(rowIndex).to.be.greaterThan(-1);
      return rowIndex + 1;
    },

    getFilterElementButton: async (rowIndex: number, columnIndex: number, negated = false) => {
      const tableElement = await latestFindingsTable.getElement('findings_table');
      const button = negated
        ? 'findings_table_cell_add_negated_filter'
        : 'findings_table_cell_add_filter';
      const selector = `tbody tr:nth-child(${rowIndex}) td:nth-child(${columnIndex}) button[data-test-subj="${button}"]`;
      return tableElement.findByCssSelector(selector);
    },

    addCellFilter: async (columnName: string, cellValue: string, negated = false) => {
      const columnIndex = await latestFindingsTable.getColumnIndex(columnName);
      const rowIndex = await latestFindingsTable.getRowIndexForValue(columnName, cellValue);
      const filterElement = await latestFindingsTable.getFilterElementButton(
        rowIndex,
        columnIndex,
        negated
      );
      await filterElement.click();
    },

    getColumnValues: async (columnName: string) => {
      const elementsWithNoFilterCell = ['CIS Section', '@timestamp'];
      const tableElement = await latestFindingsTable.getElement('findings_table');
      const columnIndex = await latestFindingsTable.getColumnIndex(columnName);
      const selector = elementsWithNoFilterCell.includes(columnName)
        ? `tbody tr td:nth-child(${columnIndex})`
        : `tbody tr td:nth-child(${columnIndex}) div[data-test-subj="filter_cell_value"]`;
      const columnCells = await tableElement.findAllByCssSelector(selector);

      return await Promise.all(columnCells.map((cell) => cell.getVisibleText()));
    },

    hasColumnValue: async (columnName: string, value: string) => {
      const values = await latestFindingsTable.getColumnValues(columnName);
      return values.includes(value);
    },

    toggleColumnSort: async (columnName: string, direction: 'asc' | 'desc') => {
      const element = await latestFindingsTable.getColumnHeaderCell(columnName);
      const currentSort = await element.getAttribute('aria-sort');
      if (currentSort === 'none') {
        // a click is needed to focus on Eui column header
        await element.click();

        // default is ascending
        if (direction === 'desc') {
          const nonStaleElement = await latestFindingsTable.getColumnHeaderCell(columnName);
          await nonStaleElement.click();
        }
      }
      if (
        (currentSort === 'ascending' && direction === 'desc') ||
        (currentSort === 'descending' && direction === 'asc')
      ) {
        // Without getting the element again, the click throws an error (stale element reference)
        const nonStaleElement = await latestFindingsTable.getColumnHeaderCell(columnName);
        await nonStaleElement.click();
      }
    },
  };

  const findingsByResourceTable = {
    getElementRow: (id: string, section: string) =>
      testSubjects.find(`findings_resource_table_row_${id}/${section}`),

    hasColumnName: async (columnName: string) => {
      const headers = await latestFindingsTable.getHeaders('findings_container');
      const texts = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = texts.findIndex((i) => i === columnName);
      return columnIndex >= 0 ? true : false;
    },

    clickOnResourceIdLink: async (value: string, section: string) => {
      const findingsTable = await findingsByResourceTable.getElementRow(value, section);
      const selector = `a[title="${value}"]`;
      const rowValueSelect = await findingsTable.findByCssSelector(selector);
      await rowValueSelect.click();
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
    latestFindingsTable,
    findingsByResourceTable,
    index,
    distributionBar,
  };
}
