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
    add: async <T>(findingsMock: T[]) => {
      await Promise.all([
        ...findingsMock.map((finding) =>
          es.index({
            index: FINDINGS_INDEX,
            body: {
              ...finding,
              '@timestamp': new Date().toISOString(),
            },
            refresh: true,
          })
        ),
        ...findingsMock.map((finding) =>
          es.index({
            index: FINDINGS_LATEST_INDEX,
            body: {
              ...finding,
              '@timestamp': new Date().toISOString(),
            },
            refresh: true,
          })
        ),
      ]);
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
      await testSubjects.click(actionTestSubject);
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

  const latestFindingsTable = createTableObject('latest_findings_table');
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
  };
}
