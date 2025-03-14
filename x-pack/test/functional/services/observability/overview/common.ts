/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

// Based on the x-pack/test/functional/es_archives/observability/alerts archive.
const DATE_WITH_DATA = {
  rangeFrom: '2021-10-18T13:36:22.109Z',
  rangeTo: '2021-10-20T13:36:22.109Z',
};

const DATE_WITHOUT_DATA = {
  rangeFrom: '2021-09-18T13:36:22.109Z',
  rangeTo: '2021-09-20T13:36:22.109Z',
};

const ALERTS_TITLE = 'Alerts';
const ALERTS_ACCORDION_SELECTOR = `accordion-${ALERTS_TITLE}`;
const ALERTS_SECTION_BUTTON_CSS_SELECTOR = `[data-test-subj=${ALERTS_ACCORDION_SELECTOR}] button.euiAccordion__button`;
const ALERTS_TABLE_NO_DATA_SELECTOR = 'alertsTableEmptyState';
const ALERTS_TABLE_WITH_DATA_SELECTOR = 'alertsTable';
const ALERTS_TABLE_LOADING_SELECTOR = 'internalAlertsPageLoading';

export function ObservabilityOverviewCommonProvider({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const find = getService('find');
  const pageObjects = getPageObjects(['common', 'header']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const navigateToOverviewPageWithAlerts = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/overview',
      `?rangeFrom=${DATE_WITH_DATA.rangeFrom}&rangeTo=${DATE_WITH_DATA.rangeTo}`,
      { ensureCurrentUrl: false }
    );
  };

  const navigateToOverviewPageWithoutAlerts = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/overview',
      `?rangeFrom=${DATE_WITHOUT_DATA.rangeFrom}&rangeTo=${DATE_WITHOUT_DATA.rangeTo}`,
      { ensureCurrentUrl: false }
    );
  };

  const navigateToOverviewPage = async () => {
    await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/overview',
      undefined,
      { ensureCurrentUrl: false }
    );
    await pageObjects.header.waitUntilLoadingHasFinished();
  };

  const waitForAlertsAccordionToAppear = async () => {
    await retry.waitFor('alert accordion to appear', async () => {
      return await testSubjects.exists(ALERTS_ACCORDION_SELECTOR);
    });
  };

  const waitForAlertsTableLoadingToDisappear = async () => {
    await testSubjects.missingOrFail(ALERTS_TABLE_LOADING_SELECTOR, { timeout: 30_000 });
  };

  const openAlertsSection = async () => {
    await waitForAlertsAccordionToAppear();
    await find.clickByCssSelector(ALERTS_SECTION_BUTTON_CSS_SELECTOR);
  };

  const openAlertsSectionAndWaitToAppear = async () => {
    await openAlertsSection();
    await waitForAlertsTableLoadingToDisappear();
    await retry.waitFor('alerts table to appear', async () => {
      return (
        (await testSubjects.exists(ALERTS_TABLE_NO_DATA_SELECTOR)) ||
        (await testSubjects.exists(ALERTS_TABLE_WITH_DATA_SELECTOR))
      );
    });
  };

  const getAlertsTableNoDataOrFail = async () => {
    return await testSubjects.existOrFail(ALERTS_TABLE_NO_DATA_SELECTOR);
  };

  return {
    getAlertsTableNoDataOrFail,
    navigateToOverviewPageWithAlerts,
    navigateToOverviewPageWithoutAlerts,
    navigateToOverviewPage,
    openAlertsSectionAndWaitToAppear,
  };
}
