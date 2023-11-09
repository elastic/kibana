/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { FtrProviderContext } from '../ftr_provider_context';

// Defined in CSP plugin
const FINDINGS_INDEX = 'logs-cloud_security_posture.findings-default';
const FINDINGS_LATEST_INDEX = 'logs-cloud_security_posture.findings_latest-default';

export function FindingsPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header']);
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
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .expect(200);
      expect(response.body).to.eql({ isPluginInitialized: true });
      log.debug('CSP plugin is initialized');
    });

  const index = {
    remove: () =>
      Promise.all([
        es.deleteByQuery({
          index: FINDINGS_INDEX,
          query: {
            match_all: {},
          },
          ignore_unavailable: true,
          refresh: true,
        }),
        es.deleteByQuery({
          index: FINDINGS_LATEST_INDEX,
          query: {
            match_all: {},
          },
          ignore_unavailable: true,
          refresh: true,
        }),
      ]),
    add: async (findingsMock: Array<Record<string, unknown>>) => {
      await Promise.all([
        ...findingsMock.map((finding) =>
          es.index({
            index: FINDINGS_INDEX,
            body: {
              ...finding,
              '@timestamp': finding['@timestamp'] ?? new Date().toISOString(),
            },
            refresh: true,
          })
        ),
        ...findingsMock.map((finding) =>
          es.index({
            index: FINDINGS_LATEST_INDEX,
            body: {
              ...finding,
              '@timestamp': finding['@timestamp'] ?? new Date().toISOString(),
            },
            refresh: true,
          })
        ),
      ]);
    },
  };

  const detectionRuleApi = {
    remove: async () => {
      await supertest
        .post('/api/detection_engine/rules/_bulk_action?dry_run=false')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send({
          action: 'delete',
          query: '',
        })
        .expect(200);
    },
  };

  const distributionBar = {
    filterBy: async (type: 'passed' | 'failed') =>
      testSubjects.click(type === 'failed' ? 'distribution_bar_failed' : 'distribution_bar_passed'),
  };

  const createNotInstalledObject = (notInstalledSubject: string) => ({
    getElement() {
      return testSubjects.find(notInstalledSubject);
    },

    async navigateToAction(actionTestSubject: string) {
      return await retry.try(async () => {
        await testSubjects.click(actionTestSubject);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const result = await testSubjects.exists('createPackagePolicy_pageTitle');

        if (!result) {
          throw new Error('Integration installation page not found');
        }
      });
    },
  });

  const createDataTableObject = (tableTestSubject: string) => ({
    getElement() {
      return testSubjects.find(tableTestSubject);
    },

    async getHeaders() {
      const element = await this.getElement();
      return await element.findAllByCssSelector('.euiDataGridHeader');
    },

    async getColumnIndex(columnName: string) {
      const element = await this.getElement();
      const columnIndex = await (
        await element.findByCssSelector(`[data-gridcell-column-id="${columnName}"]`)
      ).getAttribute('data-gridcell-column-index');
      expect(columnIndex).to.be.greaterThan(-1);
      return columnIndex;
    },

    async getColumnHeaderCell(columnName: string) {
      const headers = await this.getHeaders();
      const headerIndexes = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = headerIndexes.findIndex((i) => i === columnName);
      return headers[columnIndex];
    },

    async getRowsCount() {
      const element = await this.getElement();
      const rows = await element.findAllByCssSelector('.euiDataGridRow');
      return rows.length;
    },

    async getFindingsCount(type: 'passed' | 'failed') {
      const element = await this.getElement();
      const items = await element.findAllByCssSelector(`span[data-test-subj="${type}_finding"]`);
      return items.length;
    },

    async getRowIndexForValue(columnName: string, value: string) {
      const values = await this.getColumnValues(columnName);
      const rowIndex = values.indexOf(value);
      expect(rowIndex).to.be.greaterThan(-1);
      return rowIndex;
    },

    async getFilterElementButton(rowIndex: number, columnIndex: number | string, negated = false) {
      const tableElement = await this.getElement();
      const button = negated ? 'filterOutButton' : 'filterForButton';
      const selector = `[data-gridcell-row-index="${rowIndex}"][data-gridcell-column-index="${columnIndex}"] button[data-test-subj="${button}"]`;
      return tableElement.findByCssSelector(selector);
    },

    async addCellFilter(columnName: string, cellValue: string, negated = false) {
      const columnIndex = await this.getColumnIndex(columnName);
      const rowIndex = await this.getRowIndexForValue(columnName, cellValue);
      const filterElement = await this.getFilterElementButton(rowIndex, columnIndex, negated);
      await filterElement.click();
    },

    async getColumnValues(columnName: string) {
      const tableElement = await this.getElement();
      const selector = `.euiDataGridRowCell[data-gridcell-column-id="${columnName}"]`;
      const columnCells = await tableElement.findAllByCssSelector(selector);

      return await Promise.all(columnCells.map((cell) => cell.getVisibleText()));
    },

    async hasColumnValue(columnName: string, value: string) {
      const values = await this.getColumnValues(columnName);
      return values.includes(value);
    },

    async toggleColumnSort(columnName: string, direction: 'asc' | 'desc') {
      const currentSorting = await testSubjects.find('dataGridColumnSortingButton');
      const currentSortingText = await currentSorting.getVisibleText();
      await currentSorting.click();

      if (currentSortingText !== 'Sort fields') {
        const clearSortButton = await testSubjects.find('dataGridColumnSortingClearButton');
        await clearSortButton.click();
      }

      const selectSortFieldButton = await testSubjects.find('dataGridColumnSortingSelectionButton');
      await selectSortFieldButton.click();

      const sortField = await testSubjects.find(
        `dataGridColumnSortingPopoverColumnSelection-${columnName}`
      );
      await sortField.click();

      const sortDirection = await testSubjects.find(
        `euiDataGridColumnSorting-sortColumn-${columnName}-${direction}`
      );
      await sortDirection.click();
      await currentSorting.click();
    },

    async openFlyoutAt(rowIndex: number) {
      const table = await this.getElement();
      const flyoutButton = await table.findAllByTestSubject('docTableExpandToggleColumn');
      await flyoutButton[rowIndex].click();
    },
  });

  const createTableObject = (tableTestSubject: string) => ({
    getElement() {
      return testSubjects.find(tableTestSubject);
    },

    async getHeaders() {
      const element = await this.getElement();
      return await element.findAllByCssSelector('thead tr :is(th,td)');
    },

    async getColumnIndex(columnName: string) {
      const headers = await this.getHeaders();
      const texts = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = texts.findIndex((i) => i === columnName);
      expect(columnIndex).to.be.greaterThan(-1);
      return columnIndex + 1;
    },

    async getColumnHeaderCell(columnName: string) {
      const headers = await this.getHeaders();
      const headerIndexes = await Promise.all(headers.map((header) => header.getVisibleText()));
      const columnIndex = headerIndexes.findIndex((i) => i === columnName);
      return headers[columnIndex];
    },

    async getRowsCount() {
      const element = await this.getElement();
      const rows = await element.findAllByCssSelector('tbody tr');
      return rows.length;
    },

    async getFindingsCount(type: 'passed' | 'failed') {
      const element = await this.getElement();
      const items = await element.findAllByCssSelector(`span[data-test-subj="${type}_finding"]`);
      return items.length;
    },

    async getRowIndexForValue(columnName: string, value: string) {
      const values = await this.getColumnValues(columnName);
      const rowIndex = values.indexOf(value);
      expect(rowIndex).to.be.greaterThan(-1);
      return rowIndex + 1;
    },

    async getFilterElementButton(rowIndex: number, columnIndex: number, negated = false) {
      const tableElement = await this.getElement();
      const button = negated
        ? 'findings_table_cell_add_negated_filter'
        : 'findings_table_cell_add_filter';
      const selector = `tbody tr:nth-child(${rowIndex}) td:nth-child(${columnIndex}) button[data-test-subj="${button}"]`;
      return tableElement.findByCssSelector(selector);
    },

    async addCellFilter(columnName: string, cellValue: string, negated = false) {
      const columnIndex = await this.getColumnIndex(columnName);
      const rowIndex = await this.getRowIndexForValue(columnName, cellValue);
      const filterElement = await this.getFilterElementButton(rowIndex, columnIndex, negated);
      await filterElement.click();
    },

    async getColumnValues(columnName: string) {
      const elementsWithNoFilterCell = ['CIS Section', '@timestamp'];
      const tableElement = await this.getElement();
      const columnIndex = await this.getColumnIndex(columnName);
      const selector = elementsWithNoFilterCell.includes(columnName)
        ? `tbody tr td:nth-child(${columnIndex})`
        : `tbody tr td:nth-child(${columnIndex}) div[data-test-subj="filter_cell_value"]`;
      const columnCells = await tableElement.findAllByCssSelector(selector);

      return await Promise.all(columnCells.map((cell) => cell.getVisibleText()));
    },

    async hasColumnValue(columnName: string, value: string) {
      const values = await this.getColumnValues(columnName);
      return values.includes(value);
    },

    async toggleColumnSort(columnName: string, direction: 'asc' | 'desc') {
      const element = await this.getColumnHeaderCell(columnName);
      const currentSort = await element.getAttribute('aria-sort');
      if (currentSort === 'none') {
        // a click is needed to focus on Eui column header
        await element.click();

        // default is ascending
        if (direction === 'desc') {
          const nonStaleElement = await this.getColumnHeaderCell(columnName);
          await nonStaleElement.click();
        }
      }
      if (
        (currentSort === 'ascending' && direction === 'desc') ||
        (currentSort === 'descending' && direction === 'asc')
      ) {
        // Without getting the element again, the click throws an error (stale element reference)
        const nonStaleElement = await this.getColumnHeaderCell(columnName);
        await nonStaleElement.click();
      }
    },

    async openFlyoutAt(rowIndex: number) {
      const table = await this.getElement();
      const flyoutButton = await table.findAllByTestSubject('findings_table_expand_column');
      await flyoutButton[rowIndex].click();
    },
  });

  const navigateToLatestFindingsPage = async () => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      'cloud_security_posture/findings',
      { shouldUseHashForSubUrl: false }
    );
  };

  const navigateToVulnerabilities = async () => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      'cloud_security_posture/findings/vulnerabilities',
      { shouldUseHashForSubUrl: false }
    );
  };

  const navigateToMisconfigurations = async () => {
    await PageObjects.common.navigateToUrl(
      'securitySolution', // Defined in Security Solution plugin
      'cloud_security_posture/findings/configurations',
      { shouldUseHashForSubUrl: false }
    );
  };

  const latestFindingsTable = createDataTableObject('latest_findings_table');
  const resourceFindingsTable = createTableObject('resource_findings_table');
  const findingsByResourceTable = {
    ...createTableObject('findings_by_resource_table'),
    async clickResourceIdLink(resourceId: string, sectionName: string) {
      const table = await this.getElement();
      const row = await table.findByCssSelector(
        `[data-test-subj="findings_resource_table_row_${resourceId}/${sectionName}"]`
      );
      const link = await row.findByCssSelector(
        '[data-test-subj="findings_by_resource_table_resource_id_column"'
      );
      await link.click();
    },
  };
  const notInstalledVulnerabilities = createNotInstalledObject('cnvm-integration-not-installed');
  const notInstalledCSP = createNotInstalledObject('cloud_posture_page_package_not_installed');

  const vulnerabilityDataGrid = {
    getVulnerabilityTable: async () => testSubjects.find('euiDataGrid'),
  };

  const createFlyoutObject = (tableTestSubject: string) => ({
    async getElement() {
      return await testSubjects.find(tableTestSubject);
    },
    async clickTakeActionButton() {
      const element = await this.getElement();
      const button = await element.findByCssSelector('[data-test-subj="csp:take_action"] button');
      await button.click();
      return button;
    },
    async clickTakeActionCreateRuleButton() {
      await this.clickTakeActionButton();
      const button = await testSubjects.find('csp:create_rule');
      await button.click();
      return button;
    },
    async getVisibleText(testSubj: string) {
      const element = await this.getElement();
      return await (await element.findByTestSubject(testSubj)).getVisibleText();
    },
  });

  const misconfigurationsFlyout = createFlyoutObject('findings_flyout');

  const toastMessage = async (testSubj = 'csp:toast-success') => ({
    async getElement() {
      return await testSubjects.find(testSubj);
    },
    async clickToastMessageLink(linkTestSubj = 'csp:toast-success-link') {
      const element = await this.getElement();
      const link = await element.findByTestSubject(linkTestSubj);
      await link.click();
    },
  });

  const isLatestFindingsTableThere = async () => {
    const table = await testSubjects.findAll('docTable');
    const trueOrFalse = table.length > 0 ? true : false;
    return trueOrFalse;
  };

  return {
    navigateToLatestFindingsPage,
    navigateToVulnerabilities,
    navigateToMisconfigurations,
    latestFindingsTable,
    resourceFindingsTable,
    findingsByResourceTable,
    notInstalledVulnerabilities,
    notInstalledCSP,
    index,
    waitForPluginInitialized,
    distributionBar,
    vulnerabilityDataGrid,
    misconfigurationsFlyout,
    toastMessage,
    detectionRuleApi,
    isLatestFindingsTableThere,
  };
}
