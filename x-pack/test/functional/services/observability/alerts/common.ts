/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { chunk } from 'lodash';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, AlertStatus } from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { WebElementWrapper } from '../../../../../../test/functional/services/lib/web_element_wrapper';

// Based on the x-pack/test/functional/es_archives/observability/alerts archive.
const DATE_WITH_DATA = {
  rangeFrom: '2021-10-18T13:36:22.109Z',
  rangeTo: '2021-10-20T13:36:22.109Z',
};

const ALERTS_FLYOUT_SELECTOR = 'alertsFlyout';
const FILTER_FOR_VALUE_BUTTON_SELECTOR = 'filterForValue';
const ALERTS_TABLE_CONTAINER_SELECTOR = 'events-viewer-panel';
const VIEW_RULE_DETAILS_SELECTOR = 'viewRuleDetails';
const VIEW_RULE_DETAILS_FLYOUT_SELECTOR = 'viewRuleDetailsFlyout';

const ACTION_COLUMN_INDEX = 0;

type WorkflowStatus = 'open' | 'acknowledged' | 'closed';

export function ObservabilityAlertsCommonProvider({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const flyoutService = getService('flyout');
  const pageObjects = getPageObjects(['common']);
  const retry = getService('retry');
  const toasts = getService('toasts');
  const kibanaServer = getService('kibanaServer');

  const navigateToTimeWithData = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/alerts',
      `?_a=(rangeFrom:'${DATE_WITH_DATA.rangeFrom}',rangeTo:'${DATE_WITH_DATA.rangeTo}')`,
      { ensureCurrentUrl: false }
    );
  };

  const navigateToRulesPage = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/alerts/rules',
      '?',
      { ensureCurrentUrl: false }
    );
  };

  const navigateWithoutFilter = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/alerts',
      `?`,
      { ensureCurrentUrl: false }
    );
  };

  const setKibanaTimeZoneToUTC = async () => {
    await kibanaServer.uiSettings.update({
      'dateFormat:tz': 'UTC',
    });
  };

  const getTableColumnHeaders = async () => {
    const table = await testSubjects.find(ALERTS_TABLE_CONTAINER_SELECTOR);
    const tableHeaderRow = await testSubjects.findDescendant('dataGridHeader', table);
    const columnHeaders = await tableHeaderRow.findAllByXpath('./div');
    return columnHeaders;
  };

  const getTableCells = async () => {
    // NOTE: This isn't ideal, but EuiDataGrid doesn't really have the concept of "rows"
    return await testSubjects.findAll('dataGridRowCell');
  };

  const getAllDisabledCheckBoxInTable = async () => {
    return await find.allByCssSelector('.euiDataGridRowCell input[type="checkbox"]:disabled');
  };

  const getAllEnabledCheckBoxInTable = async () => {
    return await find.allByCssSelector('.euiDataGridRowCell input[type="checkbox"]:enabled');
  };

  const getExperimentalDisclaimer = async () => {
    return testSubjects.existOrFail('o11yExperimentalDisclaimer');
  };

  const getTableCellsInRows = async () => {
    const columnHeaders = await getTableColumnHeaders();
    if (columnHeaders.length <= 0) {
      return [];
    }
    const cells = await getTableCells();
    return chunk(cells, columnHeaders.length);
  };

  const getTableOrFail = async () => {
    return await testSubjects.existOrFail(ALERTS_TABLE_CONTAINER_SELECTOR);
  };

  const getNoDataPageOrFail = async () => {
    return await testSubjects.existOrFail('noDataPage');
  };

  const getNoDataStateOrFail = async () => {
    return await testSubjects.existOrFail('tGridEmptyState');
  };

  // Query Bar
  const getQueryBar = async () => {
    return await testSubjects.find('queryInput');
  };

  const getQuerySubmitButton = async () => {
    return await testSubjects.find('querySubmitButton');
  };

  const clearQueryBar = async () => {
    return await (await getQueryBar()).clearValueWithKeyboard();
  };

  const typeInQueryBar = async (query: string) => {
    return await (await getQueryBar()).type(query);
  };

  const submitQuery = async (query: string) => {
    await typeInQueryBar(query);
    return await (await getQuerySubmitButton()).click();
  };

  // Flyout
  const getOpenFlyoutButton = async () => {
    return await testSubjects.find('openFlyoutButton');
  };

  const openAlertsFlyout = async () => {
    await (await getOpenFlyoutButton()).click();
    await retry.waitFor(
      'flyout open',
      async () => await testSubjects.exists(ALERTS_FLYOUT_SELECTOR, { timeout: 2500 })
    );
  };

  const getAlertsFlyout = async () => {
    return await testSubjects.find(ALERTS_FLYOUT_SELECTOR);
  };

  const getAlertsFlyoutOrFail = async () => {
    return await testSubjects.existOrFail(ALERTS_FLYOUT_SELECTOR);
  };

  const getAlertsFlyoutTitle = async () => {
    return await testSubjects.find('alertsFlyoutTitle');
  };

  const closeAlertsFlyout = async () => {
    return await flyoutService.close(ALERTS_FLYOUT_SELECTOR);
  };

  const getAlertsFlyoutViewInAppButtonOrFail = async () => {
    return await testSubjects.existOrFail('alertsFlyoutViewInAppButton');
  };

  const getAlertsFlyoutViewRuleDetailsLinkOrFail = async () => {
    return await testSubjects.existOrFail('viewRuleDetailsFlyout');
  };

  const getAlertsFlyoutDescriptionListTitles = async (): Promise<WebElementWrapper[]> => {
    const flyout = await getAlertsFlyout();
    return await testSubjects.findAllDescendant('alertsFlyoutDescriptionListTitle', flyout);
  };

  const getAlertsFlyoutDescriptionListDescriptions = async (): Promise<WebElementWrapper[]> => {
    const flyout = await getAlertsFlyout();
    return await testSubjects.findAllDescendant('alertsFlyoutDescriptionListDescription', flyout);
  };

  // Cell actions

  const filterForValueButtonExists = async () => {
    return await testSubjects.exists(FILTER_FOR_VALUE_BUTTON_SELECTOR);
  };

  const getFilterForValueButton = async () => {
    return await testSubjects.find(FILTER_FOR_VALUE_BUTTON_SELECTOR);
  };

  const openActionsMenuForRow = async (rowIndex: number) => {
    const rows = await getTableCellsInRows();
    const actionsOverflowButton = await testSubjects.findDescendant(
      'alertsTableRowActionMore',
      rows[rowIndex][ACTION_COLUMN_INDEX]
    );
    await actionsOverflowButton.click();
  };

  const viewRuleDetailsButtonClick = async () => {
    return await (await testSubjects.find(VIEW_RULE_DETAILS_SELECTOR)).click();
  };
  const viewRuleDetailsLinkClick = async () => {
    return await (await testSubjects.find(VIEW_RULE_DETAILS_FLYOUT_SELECTOR)).click();
  };
  // Workflow status
  const setWorkflowStatusForRow = async (rowIndex: number, workflowStatus: WorkflowStatus) => {
    await openActionsMenuForRow(rowIndex);

    if (workflowStatus === 'closed') {
      await testSubjects.click('close-alert-status');
    } else {
      await testSubjects.click(`${workflowStatus}-alert-status`);
    }

    // wait for a confirmation toast (the css index is 1-based)
    await toasts.getToastElement(1);
    await toasts.dismissAllToasts();
  };

  const setWorkflowStatusFilter = async (workflowStatus: WorkflowStatus) => {
    const buttonGroupButton = await testSubjects.find(
      `workflowStatusFilterButton-${workflowStatus}`
    );
    await buttonGroupButton.click();
  };

  const getWorkflowStatusFilterValue = async () => {
    const selectedWorkflowStatusButton = await find.byClassName('euiButtonGroupButton-isSelected');
    return await selectedWorkflowStatusButton.getVisibleText();
  };

  // Alert status
  const setAlertStatusFilter = async (alertStatus?: AlertStatus) => {
    let buttonSubject = 'alert-status-filter-show-all-button';
    if (alertStatus === ALERT_STATUS_ACTIVE) {
      buttonSubject = 'alert-status-filter-active-button';
    }
    if (alertStatus === ALERT_STATUS_RECOVERED) {
      buttonSubject = 'alert-status-filter-recovered-button';
    }
    const buttonGroupButton = await testSubjects.find(buttonSubject);
    await buttonGroupButton.click();
  };

  const alertDataIsBeingLoaded = async () => {
    return testSubjects.existOrFail('events-container-loading-true');
  };

  const alertDataHasLoaded = async () => {
    await retry.waitFor(
      'Alert Table is loaded',
      async () => await testSubjects.exists('events-container-loading-false', { timeout: 2500 })
    );
  };

  // Date picker
  const getTimeRange = async () => {
    const isAbsoluteRange = await testSubjects.exists('superDatePickerstartDatePopoverButton');

    if (isAbsoluteRange) {
      const startButton = await testSubjects.find('superDatePickerstartDatePopoverButton');
      const endButton = await testSubjects.find('superDatePickerendDatePopoverButton');
      return `${await startButton.getVisibleText()} - ${await endButton.getVisibleText()}`;
    }

    const datePickerButton = await testSubjects.find('superDatePickerShowDatesButton');
    const buttonText = await datePickerButton.getVisibleText();
    return buttonText;
  };

  const getActionsButtonByIndex = async (index: number) => {
    const actionsOverflowButtons = await find.allByCssSelector(
      '[data-test-subj="alertsTableRowActionMore"]'
    );
    return actionsOverflowButtons[index] || null;
  };

  const getRuleStatValue = async (testSubj: string) => {
    const stat = await testSubjects.find(testSubj);
    const title = await stat.findByCssSelector('.euiStat__title');
    const count = await title.getVisibleText();
    const value = Number.parseInt(count, 10);
    expect(Number.isNaN(value)).to.be(false);
    return value;
  };

  return {
    getQueryBar,
    clearQueryBar,
    closeAlertsFlyout,
    filterForValueButtonExists,
    getAlertsFlyout,
    getAlertsFlyoutDescriptionListDescriptions,
    getAlertsFlyoutDescriptionListTitles,
    getAlertsFlyoutOrFail,
    getAlertsFlyoutTitle,
    getAlertsFlyoutViewInAppButtonOrFail,
    getAllDisabledCheckBoxInTable,
    getAllEnabledCheckBoxInTable,
    getFilterForValueButton,
    getNoDataPageOrFail,
    getNoDataStateOrFail,
    getTableCells,
    getTableCellsInRows,
    getTableColumnHeaders,
    getTableOrFail,
    navigateToTimeWithData,
    setKibanaTimeZoneToUTC,
    openAlertsFlyout,
    setWorkflowStatusForRow,
    setWorkflowStatusFilter,
    getWorkflowStatusFilterValue,
    setAlertStatusFilter,
    alertDataIsBeingLoaded,
    alertDataHasLoaded,
    submitQuery,
    typeInQueryBar,
    openActionsMenuForRow,
    getTimeRange,
    navigateWithoutFilter,
    getExperimentalDisclaimer,
    getActionsButtonByIndex,
    viewRuleDetailsButtonClick,
    viewRuleDetailsLinkClick,
    getAlertsFlyoutViewRuleDetailsLinkOrFail,
    getRuleStatValue,
    navigateToRulesPage,
  };
}
