/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import querystring from 'querystring';
import rison from '@kbn/rison';
import expect from '@kbn/expect';
import { TimeUnitId } from '@elastic/eui';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import {
  OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY,
  datasetQualityUrlSchemaV1,
} from '@kbn/observability-logs-explorer-plugin/common';
import { FtrProviderContext } from '../ftr_provider_context';

const defaultPageState: datasetQualityUrlSchemaV1.UrlSchema = {
  v: 1,
  table: {
    page: 0,
  },
  filters: {},
  flyout: {},
};

type SummaryPanelKpi = Record<
  | 'datasetHealthPoor'
  | 'datasetHealthDegraded'
  | 'datasetHealthGood'
  | 'activeDatasets'
  | 'estimatedData',
  string
>;

export function DatasetQualityPageObject({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const euiSelectable = getService('selectable');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');

  const selectors = {
    datasetQualityTable: '[data-test-subj="datasetQualityTable"]',
    datasetQualityTableColumn: (column: number) =>
      `[data-test-subj="datasetQualityTable"] .euiTableRowCell:nth-child(${column})`,
    datasetSearchInput: '[placeholder="Filter datasets"]',
    showFullDatasetNamesSwitch: 'button[aria-label="Show full dataset names"]',
    showInactiveDatasetsNamesSwitch: 'button[aria-label="Show inactive datasets"]',
  };

  const testSubjectSelectors = {
    datasetQualityTable: 'datasetQualityTable',
    datasetQualityFiltersContainer: 'datasetQualityFiltersContainer',
    datasetQualityExpandButton: 'datasetQualityExpandButton',
    datasetQualityFlyout: 'datasetQualityFlyout',
    datasetQualityFlyoutBody: 'datasetQualityFlyoutBody',
    datasetQualityFlyoutTitle: 'datasetQualityFlyoutTitle',
    datasetQualityHeaderButton: 'datasetQualityHeaderButton',
    datasetQualityFlyoutFieldValue: 'datasetQualityFlyoutFieldValue',
    datasetQualityFilterBarFieldSearch: 'datasetQualityFilterBarFieldSearch',
    datasetQualityIntegrationsSelectable: 'datasetQualityIntegrationsSelectable',
    datasetQualityIntegrationsSelectableButton: 'datasetQualityIntegrationsSelectableButton',
    datasetQualityNamespacesSelectable: 'datasetQualityNamespacesSelectable',
    datasetQualityNamespacesSelectableButton: 'datasetQualityNamespacesSelectableButton',
    datasetQualityDatasetHealthKpi: 'datasetQualityDatasetHealthKpi',

    superDatePickerToggleQuickMenuButton: 'superDatePickerToggleQuickMenuButton',
    superDatePickerApplyTimeButton: 'superDatePickerApplyTimeButton',
    superDatePickerQuickMenu: 'superDatePickerQuickMenu',
    euiFlyoutCloseButton: 'euiFlyoutCloseButton',
  };

  return {
    selectors,
    testSubjectSelectors,
    texts,

    async navigateTo({
      pageState,
    }: {
      pageState?: datasetQualityUrlSchemaV1.UrlSchema;
    } = {}) {
      const queryStringParams = querystring.stringify({
        [OBSERVABILITY_DATASET_QUALITY_URL_STATE_KEY]: rison.encode(
          datasetQualityUrlSchemaV1.urlSchemaRT.encode({
            ...defaultPageState,
            ...pageState,
          })
        ),
      });

      return PageObjects.common.navigateToUrlWithBrowserHistory(
        'observabilityLogsExplorer',
        '/dataset-quality',
        queryStringParams,
        {
          // the check sometimes is too slow for the page so it misses the point
          // in time before the app rewrites the URL
          ensureCurrentUrl: false,
        }
      );
    },

    async waitUntilTableLoaded() {
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading');
    },

    async waitUntilSummaryPanelLoaded() {
      await testSubjects.missingOrFail(`datasetQuality-${texts.activeDatasets}-loading`);
      await testSubjects.missingOrFail(`datasetQuality-${texts.estimatedData}-loading`);
    },

    async parseSummaryPanel(excludeKeys: string[] = []): Promise<SummaryPanelKpi> {
      const kpiTitleAndKeys = [
        { title: texts.datasetHealthPoor, key: 'datasetHealthPoor' },
        { title: texts.datasetHealthDegraded, key: 'datasetHealthDegraded' },
        { title: texts.datasetHealthGood, key: 'datasetHealthGood' },
        { title: texts.activeDatasets, key: 'activeDatasets' },
        { title: texts.estimatedData, key: 'estimatedData' },
      ].filter((item) => !excludeKeys.includes(item.key));

      const kpiTexts = await Promise.all(
        kpiTitleAndKeys.map(async ({ title, key }) => ({
          key,
          value: await testSubjects.getVisibleText(
            `${testSubjectSelectors.datasetQualityDatasetHealthKpi}-${title}`
          ),
        }))
      );

      return kpiTexts.reduce(
        (acc, { key, value }) => ({
          ...acc,
          [key]: value,
        }),
        {} as SummaryPanelKpi
      );
    },

    getDatasetsTable(): Promise<WebElementWrapper> {
      return testSubjects.find(testSubjectSelectors.datasetQualityTable);
    },

    async refreshTable() {
      const filtersContainer = await testSubjects.find(
        testSubjectSelectors.datasetQualityFiltersContainer
      );
      const refreshButton = await filtersContainer.findByTestSubject(
        testSubjectSelectors.superDatePickerApplyTimeButton
      );
      return refreshButton.click();
    },

    async getDatasetTableRows(): Promise<WebElementWrapper[]> {
      await this.waitUntilTableLoaded();
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

    async filterForIntegrations(integrations: string[]) {
      return euiSelectable.selectOnlyOptionsWithText(
        testSubjectSelectors.datasetQualityIntegrationsSelectableButton,
        testSubjectSelectors.datasetQualityIntegrationsSelectable,
        integrations
      );
    },

    async filterForNamespaces(namespaces: string[]) {
      return euiSelectable.selectOnlyOptionsWithText(
        testSubjectSelectors.datasetQualityNamespacesSelectableButton,
        testSubjectSelectors.datasetQualityNamespacesSelectable,
        namespaces
      );
    },

    async toggleShowInactiveDatasets() {
      return find.clickByCssSelector(selectors.showInactiveDatasetsNamesSwitch);
    },

    async toggleShowFullDatasetNames() {
      return find.clickByCssSelector(selectors.showFullDatasetNamesSwitch);
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

        await expanderButtons[testDatasetRowIndex].click(); // Click "Open"
      });
    },

    async closeFlyout() {
      return testSubjects.click(testSubjectSelectors.euiFlyoutCloseButton);
    },

    async getFlyoutElementsByText(selector: string, text: string) {
      const flyoutContainer: WebElementWrapper = await testSubjects.find(
        testSubjectSelectors.datasetQualityFlyout
      );

      return getAllByText(flyoutContainer, selector, text);
    },

    getFlyoutLogsExplorerButton() {
      return testSubjects.find(testSubjectSelectors.datasetQualityHeaderButton);
    },

    async doestTextExistInFlyout(text: string, elementSelector: string) {
      const flyoutContainer: WebElementWrapper = await testSubjects.find(
        testSubjectSelectors.datasetQualityFlyoutBody
      );

      const elements = await getAllByText(flyoutContainer, elementSelector, text);
      return elements.length > 0;
    },

    async setDatePickerLastXUnits(
      container: WebElementWrapper,
      timeValue: number,
      unit: TimeUnitId
    ) {
      await testSubjects.click(testSubjectSelectors.superDatePickerToggleQuickMenuButton);
      const datePickerQuickMenu = await testSubjects.find(
        testSubjectSelectors.superDatePickerQuickMenu
      );

      const timeTenseSelect = await datePickerQuickMenu.findByCssSelector(
        `select[aria-label="Time tense"]`
      );
      const timeValueInput = await datePickerQuickMenu.findByCssSelector(
        `input[aria-label="Time value"]`
      );
      const timeUnitSelect = await datePickerQuickMenu.findByCssSelector(
        `select[aria-label="Time unit"]`
      );

      await timeTenseSelect.focus();
      await timeTenseSelect.type('Last');

      await timeValueInput.focus();
      await timeValueInput.clearValue();
      await timeValueInput.type(timeValue.toString());

      await timeUnitSelect.focus();
      await timeUnitSelect.type(unit);

      await browser.pressKeys(browser.keys.ENTER);

      // Close the date picker quick menu
      return testSubjects.click(testSubjectSelectors.superDatePickerToggleQuickMenuButton);
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

/**
 * Get all elements matching the given selector and text
 * @example
 * const container = await testSubjects.find('myContainer');
 * const elements = await getAllByText(container, 'button', 'Click me');
 *
 * @param container { WebElementWrapper } The container to search within
 * @param selector { string } The selector to search for (or filter elements by)
 * @param text { string } The text to search for within the filtered elements
 */
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

const texts = {
  noActivityText: 'No activity in the selected timeframe',
  datasetHealthPoor: 'Poor',
  datasetHealthDegraded: 'Degraded',
  datasetHealthGood: 'Good',
  activeDatasets: 'Active Datasets',
  estimatedData: 'Estimated Data',
};
