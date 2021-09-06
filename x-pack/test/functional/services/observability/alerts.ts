/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import querystring from 'querystring';
import { FtrProviderContext } from '../../ftr_provider_context';

// Based on the x-pack/test/functional/es_archives/observability/alerts archive.
const DATE_WITH_DATA = {
  rangeFrom: '2021-09-01T13:36:22.109Z',
  rangeTo: '2021-09-03T13:36:22.109Z',
};

export function ObservabilityAlertsProvider({ getPageObjects, getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);

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
    return await testSubjects.existOrFail('events-container-loading-false');
  };

  // Query Bar
  const getQueryBar = async () => {
    return await testSubjects.find('queryInput');
  };

  const getQuerySubmitButton = async () => {
    return await testSubjects.find('querySubmitButton');
  };

  const clearQueryBar = async () => {
    return await (await getQueryBar()).clearValueWithKeyboard({ charByChar: true });
  };

  const typeInQueryBar = async (query: string) => {
    return await (await getQueryBar()).type(query);
  };

  const submitQuery = async (query: string) => {
    await typeInQueryBar(query);
    return await (await getQuerySubmitButton()).click();
  };

  // Flyout
  const getToggleFlyoutButton = async () => {
    return await testSubjects.find('toggleFlyoutButton');
  };

  const toggleFlyout = async () => {
    return await (await getToggleFlyoutButton()).click();
  };

  const getAlertsFlyout = async () => {
    return await testSubjects.find('alertsFlyout');
  };

  const getAlertsFlyoutOrFail = async () => {
    return await testSubjects.existOrFail('alertsFlyout');
  };

  const getAlertsFlyoutTitle = async () => {
    return await testSubjects.find('alertsFlyoutTitle');
  };

  const closeAlertsFlyout = async () => {
    const flyout = await getAlertsFlyout();
    return await (await testSubjects.findDescendant('euiFlyoutCloseButton', flyout)).click();
  };

  const getAlertsFlyoutViewInAppButtonOrFail = async () => {
    return await testSubjects.existOrFail('alertsFlyoutViewInAppButton');
  };

  const getAlertsFlyoutDescriptionListTitles = async () => {
    const flyout = await getAlertsFlyout();
    return await testSubjects.findAllDescendant('alertsFlyoutDescriptionListTitle', flyout);
  };

  const getAlertsFlyoutDescriptionListDescriptions = async () => {
    const flyout = await getAlertsFlyout();
    return await testSubjects.findAllDescendant('alertsFlyoutDescriptionListDescription', flyout);
  };

  return {
    clearQueryBar,
    typeInQueryBar,
    submitQuery,
    getTableCells,
    getTableOrFail,
    getNoDataStateOrFail,
    toggleFlyout,
    getAlertsFlyout,
    getAlertsFlyoutTitle,
    closeAlertsFlyout,
    navigateToTimeWithData,
    getAlertsFlyoutOrFail,
    getAlertsFlyoutViewInAppButtonOrFail,
    getAlertsFlyoutDescriptionListTitles,
    getAlertsFlyoutDescriptionListDescriptions,
  };
}
