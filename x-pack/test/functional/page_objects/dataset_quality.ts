/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../ftr_provider_context';

export interface IntegrationPackage {
  name: string;
  version: string;
}

export function DatasetQualityPageObject({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const selectors = {
    datasetQualityTable: '[data-test-subj="datasetQualityTable"]',
    datasetQualityTableColumn: (column: number) =>
      `[data-test-subj="datasetQualityTable"] .euiTableRowCell:nth-child(${column})`,
  };

  const testSubjectSelectors = {
    datasetQualityTable: 'datasetQualityTable',
    datasetQualityExpandButton: 'datasetQualityExpandButton',
    datasetQualityFlyout: 'datasetQualityFlyout',
    datasetQualityFlyoutBody: 'datasetQualityFlyoutBody',
    datasetQualityFlyoutTitle: 'datasetQualityFlyoutTitle',
    datasetQualityFlyoutOpenInLogExplorerButton: 'datasetQualityFlyoutOpenInLogExplorerButton',
    datasetQualityFlyoutFieldValue: 'datasetQualityFlyoutFieldValue',
  };

  return {
    selectors,
    testSubjectSelectors,

    getDatasetsTable(): Promise<WebElementWrapper> {
      return testSubjects.find(testSubjectSelectors.datasetQualityTable);
    },

    async getDatasetTableRows(): Promise<WebElementWrapper[]> {
      const table = await testSubjects.find(testSubjectSelectors.datasetQualityTable);
      const tBody = await table.findByTagName('tbody');
      return tBody.findAllByTagName('tr');
    },

    async parseDatasetTable() {
      const table = await this.getDatasetsTable();
      return parseDatasetTable(table, [
        '0',
        'Dataset Name',
        'Namespace',
        'Size',
        'Degraded Docs',
        'Last Activity',
        'Actions',
      ]);
    },

    async openDatasetFlyout(datasetName: string) {
      const cols = await this.parseDatasetTable();

      const datasetNameCol = cols['Dataset Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      const testDatasetRowIndex = datasetNameColCellTexts.findIndex(
        (dName) => dName === datasetName
      );

      const expanderColumn = cols['0'];
      let expanderButtons: WebElementWrapper[];

      await retry.try(async () => {
        expanderButtons = await expanderColumn.getCellChildren(
          `[data-test-subj=${testSubjectSelectors.datasetQualityExpandButton}]`
        );
        expect(expanderButtons.length).to.be.greaterThan(0);
      });

      await expanderButtons[testDatasetRowIndex].click(); // Click "Open"
    },

    async getFlyoutElementsByText(selector: string, text: string) {
      const flyoutContainer: WebElementWrapper = await testSubjects.find(
        testSubjectSelectors.datasetQualityFlyout
      );

      return await getAllByText(flyoutContainer, selector, text);
    },

    getFlyoutLogsExplorerButton() {
      return testSubjects.find(testSubjectSelectors.datasetQualityFlyoutOpenInLogExplorerButton);
    },

    async doestTextExistInFlyout(text: string, elementSelector: string) {
      const flyoutContainer: WebElementWrapper = await testSubjects.find(
        testSubjectSelectors.datasetQualityFlyoutBody
      );

      const elements = await getAllByText(flyoutContainer, elementSelector, text);
      return elements.length > 0;
    },
  };
}

async function parseDatasetTable(tableWrapper: WebElementWrapper, columnNamesOrIndexes: string[]) {
  const headerElementWrappers = await tableWrapper.findAllByCssSelector('thead th, thead td');

  const result: Record<
    string,
    {
      columnNameOrIndex: string;
      sortDirection?: 'ascending' | 'descending';
      headerElement: WebElementWrapper;
      cellElements: WebElementWrapper[];
      cellContentElements: WebElementWrapper[];
      getSortDirection: () => Promise<'ascending' | 'descending' | undefined>;
      sort: (sortDirection: 'ascending' | 'descending') => Promise<void>;
      getCellTexts: (selector?: string) => Promise<string[]>;
      getCellChildren: (selector: string) => Promise<WebElementWrapper[]>;
    }
  > = {};

  for (let i = 0; i < headerElementWrappers.length; i++) {
    const tdSelector = `table > tbody > tr td:nth-child(${i + 1})`;
    const cellContentSelector = `${tdSelector} .euiTableCellContent`;
    const thWrapper = headerElementWrappers[i];
    const columnName = await thWrapper.getVisibleText();
    const columnIndex = `${i}`;
    const columnNameOrIndex = columnNamesOrIndexes.includes(columnName)
      ? columnName
      : columnNamesOrIndexes.includes(columnIndex)
      ? columnIndex
      : undefined;

    if (columnNameOrIndex) {
      const headerElement = thWrapper;

      const tdWrappers = await tableWrapper.findAllByCssSelector(tdSelector);
      const cellContentWrappers = await tableWrapper.findAllByCssSelector(cellContentSelector);

      const getSortDirection = () =>
        headerElement.getAttribute('aria-sort') as Promise<'ascending' | 'descending' | undefined>;

      result[columnNameOrIndex] = {
        columnNameOrIndex,
        headerElement,
        cellElements: tdWrappers,
        cellContentElements: cellContentWrappers,
        getSortDirection,
        sort: async (sortDirection: 'ascending' | 'descending') => {
          if ((await getSortDirection()) !== sortDirection) {
            await headerElement.click();
          }

          // Sorting twice if the sort was in neutral state
          if ((await getSortDirection()) !== sortDirection) {
            await headerElement.click();
          }
        },
        getCellTexts: async (textContainerSelector?: string) => {
          const cellContentContainerWrappers = textContainerSelector
            ? await tableWrapper.findAllByCssSelector(`${tdSelector} ${textContainerSelector}`)
            : cellContentWrappers;

          const cellContentContainerWrapperTexts: string[] = [];
          for (let j = 0; j < cellContentContainerWrappers.length; j++) {
            const cellContentContainerWrapper = cellContentContainerWrappers[j];
            const cellContentContainerWrapperText =
              await cellContentContainerWrapper.getVisibleText();
            cellContentContainerWrapperTexts.push(cellContentContainerWrapperText);
          }

          return cellContentContainerWrapperTexts;
        },
        getCellChildren: (childSelector: string) => {
          return tableWrapper.findAllByCssSelector(`${cellContentSelector} ${childSelector}`);
        },
      };
    }
  }

  return result;
}

export async function getAllByText(container: WebElementWrapper, selector: string, text: string) {
  const elements = await container.findAllByCssSelector(selector);
  const matchingElements: WebElementWrapper[] = [];

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const elementText = await element.getVisibleText();
    if (elementText === text) {
      matchingElements.push(element);
    }
  }

  return matchingElements;
}
