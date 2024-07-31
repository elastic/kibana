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
  DATA_QUALITY_URL_STATE_KEY,
  datasetQualityUrlSchemaV1,
} from '@kbn/data-quality-plugin/common';
import {
  DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
  DEFAULT_DEGRADED_FIELD_SORT_FIELD,
} from '@kbn/dataset-quality-plugin/common/constants';
import { FtrProviderContext } from '../ftr_provider_context';

const defaultPageState: datasetQualityUrlSchemaV1.UrlSchema = {
  v: 1,
  table: {
    page: 0,
  },
  filters: {},
  flyout: {
    degradedFields: {
      table: {
        page: 0,
        rowsPerPage: 10,
        sort: {
          field: DEFAULT_DEGRADED_FIELD_SORT_FIELD,
          direction: DEFAULT_DEGRADED_FIELD_SORT_DIRECTION,
        },
      },
    },
  },
};

type SummaryPanelKpi = Record<
  | 'datasetHealthPoor'
  | 'datasetHealthDegraded'
  | 'datasetHealthGood'
  | 'activeDatasets'
  | 'estimatedData',
  string
>;

type FlyoutKpi = Record<'docsCountTotal' | 'size' | 'services' | 'hosts' | 'degradedDocs', string>;

const texts = {
  noActivityText: 'No activity in the selected timeframe',
  datasetHealthPoor: 'Poor',
  datasetHealthDegraded: 'Degraded',
  datasetHealthGood: 'Good',
  activeDatasets: 'Active Data Sets',
  estimatedData: 'Estimated Data',
  docsCountTotal: 'Docs count (total)',
  size: 'Size',
  services: 'Services',
  hosts: 'Hosts',
  degradedDocs: 'Degraded docs',
};

export function DatasetQualityPageObject({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');
  const euiSelectable = getService('selectable');
  const find = getService('find');
  const retry = getService('retry');

  const selectors = {
    datasetQualityTable: '[data-test-subj="datasetQualityTable"]',
    datasetQualityTableColumn: (column: number) =>
      `[data-test-subj="datasetQualityTable"] .euiTableRowCell:nth-child(${column})`,
    datasetSearchInput: '[placeholder="Filter data sets"]',
    showFullDatasetNamesSwitch: 'button[aria-label="Show full data set names"]',
    showInactiveDatasetsNamesSwitch: 'button[aria-label="Show inactive data sets"]',
    superDatePickerApplyButton: '.euiQuickSelect__applyButton',
  };

  const testSubjectSelectors = {
    datasetQualityTable: 'datasetQualityTable',
    datasetQualityFiltersContainer: 'datasetQualityFiltersContainer',
    datasetQualityExpandButton: 'datasetQualityExpandButton',
    datasetQualityFlyout: 'datasetQualityFlyout',
    datasetQualityFlyoutBody: 'datasetQualityFlyoutBody',
    datasetQualityFlyoutTitle: 'datasetQualityFlyoutTitle',
    datasetQualityFlyoutDegradedFieldTable: 'datasetQualityFlyoutDegradedFieldTable',
    datasetQualityFlyoutDegradedTableNoData: 'datasetQualityFlyoutDegradedTableNoData',
    datasetQualitySparkPlot: 'datasetQualitySparkPlot',
    datasetQualityHeaderButton: 'datasetQualityHeaderButton',
    datasetQualityFlyoutFieldValue: 'datasetQualityFlyoutFieldValue',
    datasetQualityFlyoutFieldsListIntegrationDetails:
      'datasetQualityFlyoutFieldsList-integration_details',
    datasetQualityFlyoutIntegrationLoading: 'datasetQualityFlyoutIntegrationLoading',
    datasetQualityFlyoutIntegrationActionsButton: 'datasetQualityFlyoutIntegrationActionsButton',
    datasetQualityFlyoutIntegrationAction: (action: string) =>
      `datasetQualityFlyoutIntegrationAction${action}`,
    datasetQualityFilterBarFieldSearch: 'datasetQualityFilterBarFieldSearch',
    datasetQualityIntegrationsSelectable: 'datasetQualityIntegrationsSelectable',
    datasetQualityIntegrationsSelectableButton: 'datasetQualityIntegrationsSelectableButton',
    datasetQualityNamespacesSelectable: 'datasetQualityNamespacesSelectable',
    datasetQualityNamespacesSelectableButton: 'datasetQualityNamespacesSelectableButton',
    datasetQualityQualitiesSelectable: 'datasetQualityQualitiesSelectable',
    datasetQualityQualitiesSelectableButton: 'datasetQualityQualitiesSelectableButton',
    datasetQualityDatasetHealthKpi: 'datasetQualityDatasetHealthKpi',
    datasetQualityFlyoutKpiValue: 'datasetQualityFlyoutKpiValue',
    datasetQualityFlyoutKpiLink: 'datasetQualityFlyoutKpiLink',
    datasetQualityInsufficientPrivileges: 'datasetQualityInsufficientPrivileges',
    datasetQualityNoDataEmptyState: 'datasetQualityNoDataEmptyState',
    datasetQualityNoPrivilegesEmptyState: 'datasetQualityNoPrivilegesEmptyState',

    superDatePickerToggleQuickMenuButton: 'superDatePickerToggleQuickMenuButton',
    superDatePickerApplyTimeButton: 'superDatePickerApplyTimeButton',
    superDatePickerQuickMenu: 'superDatePickerQuickMenu',
    euiFlyoutCloseButton: 'euiFlyoutCloseButton',
    unifiedHistogramBreakdownSelectorButton: 'unifiedHistogramBreakdownSelectorButton',
    unifiedHistogramBreakdownSelectorSelectorSearch:
      'unifiedHistogramBreakdownSelectorSelectorSearch',
    unifiedHistogramBreakdownSelectorSelectable: 'unifiedHistogramBreakdownSelectorSelectable',
    managementHome: 'managementHome',
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
        [DATA_QUALITY_URL_STATE_KEY]: rison.encode(
          datasetQualityUrlSchemaV1.urlSchemaRT.encode({
            ...defaultPageState,
            ...pageState,
          })
        ),
      });

      return PageObjects.common.navigateToUrlWithBrowserHistory(
        'management',
        '/data/data_quality',
        queryStringParams,
        {
          // the check sometimes is too slow for the page so it misses the point
          // in time before the app rewrites the URL
          ensureCurrentUrl: false,
        }
      );
    },

    async waitUntilTableLoaded() {
      await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 20 * 1000);
    },

    async waitUntilTableInFlyoutLoaded() {
      await find.waitForDeletedByCssSelector('.euiFlyoutBody .euiBasicTable-loading', 20 * 1000);
    },

    async waitUntilIntegrationsInFlyoutLoaded() {
      await find.waitForDeletedByCssSelector(
        '.euiSkeletonTitle .datasetQualityFlyoutIntegrationLoading',
        10 * 1000
      );
    },

    async waitUntilSummaryPanelLoaded(isStateful: boolean = true) {
      await testSubjects.missingOrFail(`datasetQuality-${texts.activeDatasets}-loading`);
      if (isStateful) {
        await testSubjects.missingOrFail(`datasetQuality-${texts.estimatedData}-loading`);
      }
    },

    async parseSummaryPanel(excludeKeys: string[] = []): Promise<SummaryPanelKpi> {
      const isStateful = !excludeKeys.includes('estimatedData');

      await this.waitUntilSummaryPanelLoaded(isStateful);

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

    getDatasetQualityFlyoutDegradedFieldTable(): Promise<WebElementWrapper> {
      return testSubjects.find(testSubjectSelectors.datasetQualityFlyoutDegradedFieldTable);
    },

    async getDatasetQualityFlyoutDegradedFieldTableRows(): Promise<WebElementWrapper[]> {
      await this.waitUntilTableInFlyoutLoaded();
      const table = await testSubjects.find(
        testSubjectSelectors.datasetQualityFlyoutDegradedFieldTable
      );
      const tBody = await table.findByTagName('tbody');
      return tBody.findAllByTagName('tr');
    },

    async refreshTable() {
      const filtersContainer = await testSubjects.find(
        testSubjectSelectors.datasetQualityFiltersContainer,
        20 * 1000
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

    async getDatasetTableHeaderTexts() {
      const table = await this.getDatasetsTable();
      return getDatasetTableHeaderTexts(table);
    },

    async parseDatasetTable() {
      await this.waitUntilTableLoaded();
      const table = await this.getDatasetsTable();
      return this.parseTable(table, [
        '0',
        'Data Set Name',
        'Namespace',
        'Size',
        'Data Set Quality',
        'Degraded Docs (%)',
        'Last Activity',
        'Actions',
      ]);
    },

    async parseDegradedFieldTable() {
      await this.waitUntilTableInFlyoutLoaded();
      const table = await this.getDatasetQualityFlyoutDegradedFieldTable();
      return this.parseTable(table, ['Field', 'Docs count', 'Last Occurrence']);
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

    async filterForQualities(qualities: string[]) {
      return euiSelectable.selectOnlyOptionsWithText(
        testSubjectSelectors.datasetQualityQualitiesSelectableButton,
        testSubjectSelectors.datasetQualityQualitiesSelectable,
        qualities
      );
    },

    async toggleShowInactiveDatasets() {
      return find.clickByCssSelector(selectors.showInactiveDatasetsNamesSwitch);
    },

    async toggleShowFullDatasetNames() {
      return find.clickByCssSelector(selectors.showFullDatasetNamesSwitch);
    },

    async openDatasetFlyout(datasetName: string) {
      await this.waitUntilTableLoaded();
      const cols = await this.parseDatasetTable();
      const datasetNameCol = cols['Data Set Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();
      const testDatasetRowIndex = datasetNameColCellTexts.findIndex(
        (dName) => dName === datasetName
      );

      expect(testDatasetRowIndex).to.be.greaterThan(-1);

      const expandColumn = cols['0'];
      const expandButtons = await expandColumn.getCellChildren(
        `[data-test-subj=${testSubjectSelectors.datasetQualityExpandButton}]`
      );

      expect(expandButtons.length).to.be.greaterThan(0);

      const datasetExpandButton = expandButtons[testDatasetRowIndex];

      // Check if 'title' attribute is "Expand" or "Collapse"
      const isCollapsed = (await datasetExpandButton.getAttribute('title')) === 'Expand';

      // Open if collapsed
      if (isCollapsed) {
        await datasetExpandButton.click();
      }

      await this.waitUntilIntegrationsInFlyoutLoaded();
    },

    async closeFlyout() {
      return testSubjects.click(testSubjectSelectors.euiFlyoutCloseButton);
    },

    async refreshFlyout() {
      const flyoutContainer: WebElementWrapper = await testSubjects.find(
        testSubjectSelectors.datasetQualityFlyoutBody
      );
      const refreshButton = await flyoutContainer.findByTestSubject(
        testSubjectSelectors.superDatePickerApplyTimeButton
      );
      return refreshButton.click();
    },

    async doesTextExist(selector: string, text: string) {
      const textValues = await testSubjects.getVisibleTextAll(selector);
      if (textValues && textValues.length > 0) {
        const values = textValues[0].split('\n');
        return values.includes(text);
      }

      return false;
    },

    getFlyoutLogsExplorerButton() {
      return testSubjects.find(testSubjectSelectors.datasetQualityHeaderButton);
    },

    openIntegrationActionsMenu() {
      return testSubjects.click(testSubjectSelectors.datasetQualityFlyoutIntegrationActionsButton);
    },

    getIntegrationActionButtonByAction(action: string) {
      return testSubjects.find(testSubjectSelectors.datasetQualityFlyoutIntegrationAction(action));
    },

    getIntegrationDashboardButtons() {
      return testSubjects.findAll(
        testSubjectSelectors.datasetQualityFlyoutIntegrationAction('Dashboard')
      );
    },

    // `excludeKeys` needed to circumvent `_stats` not available in Serverless  https://github.com/elastic/kibana/issues/178954
    // TODO: Remove `excludeKeys` when `_stats` is available in Serverless
    async parseFlyoutKpis(excludeKeys: string[] = []): Promise<FlyoutKpi> {
      const kpiTitleAndKeys = [
        { title: texts.docsCountTotal, key: 'docsCountTotal' },
        { title: texts.size, key: 'size' },
        { title: texts.services, key: 'services' },
        { title: texts.hosts, key: 'hosts' },
        { title: texts.degradedDocs, key: 'degradedDocs' },
      ].filter((item) => !excludeKeys.includes(item.key));

      const kpiTexts = await Promise.all(
        kpiTitleAndKeys.map(async ({ title, key }) => ({
          key,
          value: await testSubjects.getVisibleText(
            `${testSubjectSelectors.datasetQualityFlyoutKpiValue}-${title}`
          ),
        }))
      );

      return kpiTexts.reduce(
        (acc, { key, value }) => ({
          ...acc,
          [key]: value,
        }),
        {} as FlyoutKpi
      );
    },

    async setDatePickerLastXUnits(
      container: WebElementWrapper,
      timeValue: number,
      unit: TimeUnitId
    ) {
      // Only click the menu button found under the provided container
      const datePickerToggleQuickMenuButton = await container.findByTestSubject(
        testSubjectSelectors.superDatePickerToggleQuickMenuButton
      );
      await datePickerToggleQuickMenuButton.click();

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

      await (
        await datePickerQuickMenu.findByCssSelector(selectors.superDatePickerApplyButton)
      ).click();

      return testSubjects.missingOrFail(testSubjectSelectors.superDatePickerQuickMenu);
    },

    /**
     * Selects a breakdown field from the unified histogram breakdown selector
     * @param fieldText The text of the field to select. Use 'No breakdown' to clear the selection
     */
    async selectBreakdownField(fieldText: string) {
      return euiSelectable.searchAndSelectOption(
        testSubjectSelectors.unifiedHistogramBreakdownSelectorButton,
        testSubjectSelectors.unifiedHistogramBreakdownSelectorSelectable,
        testSubjectSelectors.unifiedHistogramBreakdownSelectorSelectorSearch,
        fieldText,
        fieldText
      );
    },

    async parseTable(tableWrapper: WebElementWrapper, columnNamesOrIndexes: string[]) {
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
            headerElement.getAttribute('aria-sort') as Promise<
              'ascending' | 'descending' | undefined
            >;

          result[columnNameOrIndex] = {
            columnNameOrIndex,
            headerElement,
            cellElements: tdWrappers,
            cellContentElements: cellContentWrappers,
            getSortDirection,
            sort: async (sortDirection: 'ascending' | 'descending') => {
              await retry.tryForTime(5000, async () => {
                while ((await getSortDirection()) !== sortDirection) {
                  await headerElement.click();
                }
              });
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
    },
  };
}

async function getDatasetTableHeaderTexts(tableWrapper: WebElementWrapper) {
  const headerElementWrappers = await tableWrapper.findAllByCssSelector('thead th, thead td');
  return Promise.all(
    headerElementWrappers.map((headerElementWrapper) => headerElementWrapper.getVisibleText())
  );
}
