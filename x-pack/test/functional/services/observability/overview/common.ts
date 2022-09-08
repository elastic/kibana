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

const ALERTS_SECTION_SELECTOR = 'Alerts';
const ALERTS_TABLE_NO_DATA_SELECTOR = 'alertsStateTableEmptyState';
const ALERTS_TABLE_WITH_DATA_SELECTOR = 'alertsTable';

export function ObservabilityOverviewCommonProvider({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const find = getService('find');
  const pageObjects = getPageObjects(['common']);
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

  const navigateToOverviewPage = async () => {
    return await pageObjects.common.navigateToUrlWithBrowserHistory(
      'observability',
      '/overview',
      undefined,
      { ensureCurrentUrl: false }
    );
  };

  const openAlertsSection = async () => {
    return await (
      await find.byCssSelector(`button[aria-controls="${ALERTS_SECTION_SELECTOR}"]`)
    ).click();
  };

  const openAlertsSectionAndWaitToAppear = async () => {
    await openAlertsSection();
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
    navigateToOverviewPage,
    openAlertsSectionAndWaitToAppear,
  };
}
