/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import querystring from 'querystring';
import { FtrProviderContext } from '../../ftr_provider_context';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';

// Based on the x-pack/test/functional/es_archives/observability/alerts archive.
const DATE_WITH_DATA = {
  rangeFrom: '2021-09-01T13:36:22.109Z',
  rangeTo: '2021-09-03T13:36:22.109Z',
};

const ALERTS_FLYOUT_SELECTOR = 'alertsFlyout';
const COPY_TO_CLIPBOARD_BUTTON_SELECTOR = 'copy-to-clipboard';

export function ObservabilityAlertsProvider({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const flyoutService = getService('flyout');
  const pageObjects = getPageObjects(['common']);
  const retry = getService('retry');

  const navigateToTimeWithData = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/alerts',
      `?${querystring.stringify(DATE_WITH_DATA)}`
    );
  };

  const getTableCells = async () => {
    // NOTE: This isn't ideal, but EuiDataGrid doesn't really have the concept of "rows"
    return await testSubjects.findAll('dataGridRowCell');
  };

  const getTableOrFail = async () => {
    return await testSubjects.existOrFail('events-viewer-panel');
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

  const getAlertsFlyoutDescriptionListTitles = async (): Promise<WebElementWrapper[]> => {
    const flyout = await getAlertsFlyout();
    return await testSubjects.findAllDescendant('alertsFlyoutDescriptionListTitle', flyout);
  };

  const getAlertsFlyoutDescriptionListDescriptions = async (): Promise<WebElementWrapper[]> => {
    const flyout = await getAlertsFlyout();
    return await testSubjects.findAllDescendant('alertsFlyoutDescriptionListDescription', flyout);
  };

  // Cell actions

  const copyToClipboardButtonExists = async () => {
    return await testSubjects.exists(COPY_TO_CLIPBOARD_BUTTON_SELECTOR);
  };

  const getCopyToClipboardButton = async () => {
    return await testSubjects.find(COPY_TO_CLIPBOARD_BUTTON_SELECTOR);
  };

  const getFilterForValueButton = async () => {
    return await testSubjects.find('filter-for-value');
  };

  return {
    getQueryBar,
    clearQueryBar,
    typeInQueryBar,
    submitQuery,
    getTableCells,
    getTableOrFail,
    getNoDataStateOrFail,
    openAlertsFlyout,
    getAlertsFlyout,
    getAlertsFlyoutTitle,
    closeAlertsFlyout,
    navigateToTimeWithData,
    getAlertsFlyoutOrFail,
    getAlertsFlyoutViewInAppButtonOrFail,
    getAlertsFlyoutDescriptionListTitles,
    getAlertsFlyoutDescriptionListDescriptions,
    getCopyToClipboardButton,
    getFilterForValueButton,
    copyToClipboardButtonExists,
  };
}
