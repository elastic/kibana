/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const TEST_FILTER_COLUMN_NAMES = [
  [
    'agent',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.24 (KHTML, like Gecko) Chrome/11.0.696.50 Safari/534.24',
  ],
  ['extension', 'jpg'],
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const PageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'header',
    'context',
    'discover',
    'timePicker',
    'svlCommonNavigation',
  ]);
  const kibanaServer = getService('kibanaServer');
  const filterBar = getService('filterBar');

  const checkMainViewFilters = async () => {
    for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
      expect(await filterBar.hasFilter(columnName, value, true)).to.eql(true);
    }
    expect(await PageObjects.timePicker.getTimeConfigAsAbsoluteTimes()).to.eql({
      start: PageObjects.timePicker.defaultStartTime,
      end: PageObjects.timePicker.defaultEndTime,
    });
  };

  describe('discover - context - back navigation', function contextSize() {
    before(async () => {
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await kibanaServer.uiSettings.update({
        defaultIndex: 'logstash-*',
      });
      // TODO: Serverless tests require login first
      await PageObjects.svlCommonPage.loginWithRole('viewer');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.waitUntilLoadingHasFinished();
      for (const [columnName, value] of TEST_FILTER_COLUMN_NAMES) {
        await filterBar.addFilter({ field: columnName, operation: 'is', value });
      }
      // TODO: Serverless sidebar causes the grid to be hidden, so set a larger window size
      await browser.setWindowSize(1920, 1080);
    });

    after(async function () {
      await kibanaServer.uiSettings.replace({});
    });

    it('should go back after loading', async function () {
      await retry.waitFor('user navigating to context and returning to discover', async () => {
        // navigate to the context view
        const initialHitCount = await PageObjects.discover.getHitCount();
        await dataGrid.clickRowToggle({ rowIndex: 0 });

        const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
        await rowActions[1].click();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.clickSuccessorLoadMoreButton();
        await PageObjects.context.waitUntilContextLoadingHasFinished();
        await browser.goBack();
        await PageObjects.discover.waitForDocTableLoadingComplete();
        const hitCount = await PageObjects.discover.getHitCount();
        return initialHitCount === hitCount;
      });
    });

    it('should go back via breadcrumbs with preserved state', async function () {
      await retry.waitFor(
        'user navigating to context and returning to discover via breadcrumbs',
        async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
          await rowActions[1].click();
          await PageObjects.context.waitUntilContextLoadingHasFinished();

          // TODO: Clicking breadcrumbs works differently in Serverless
          await PageObjects.svlCommonNavigation.breadcrumbs.clickBreadcrumb({
            deepLinkId: 'discover',
          });
          await PageObjects.discover.waitForDocTableLoadingComplete();

          await checkMainViewFilters();
          return true;
        }
      );
    });

    it('should go back via breadcrumbs with preserved state after a page refresh', async function () {
      await retry.waitFor(
        'user navigating to context and returning to discover via breadcrumbs',
        async () => {
          await dataGrid.clickRowToggle({ rowIndex: 0 });
          const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
          await rowActions[1].click();
          await PageObjects.context.waitUntilContextLoadingHasFinished();
          await browser.refresh();
          await PageObjects.context.waitUntilContextLoadingHasFinished();
          // TODO: Clicking breadcrumbs works differently in Serverless
          await PageObjects.svlCommonNavigation.breadcrumbs.clickBreadcrumb({
            deepLinkId: 'discover',
          });
          await PageObjects.discover.waitForDocTableLoadingComplete();

          await checkMainViewFilters();
          return true;
        }
      );
    });

    // Fails in chrome 128+: https://github.com/elastic/kibana-operations/issues/199
    it.skip('should go back via breadcrumbs with updated state after a goBack browser', async function () {
      await dataGrid.clickRowToggle({ rowIndex: 0 });
      const rowActions = await dataGrid.getRowActions({ rowIndex: 0 });
      await rowActions[1].click();
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      await PageObjects.common.sleep(5000);

      // update url state
      await filterBar.removeFilter('agent');
      await PageObjects.header.waitUntilLoadingHasFinished();

      // TODO: Clicking breadcrumbs works differently in Serverless
      await PageObjects.svlCommonNavigation.breadcrumbs.clickBreadcrumb({
        deepLinkId: 'discover',
      });
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.getFilterCount()).to.eql(2);
      await checkMainViewFilters();

      await browser.goBack();
      await PageObjects.context.waitUntilContextLoadingHasFinished();

      expect(await filterBar.getFilterCount()).to.eql(1);
      const [filterName, filterValue] = TEST_FILTER_COLUMN_NAMES[1];
      expect(await filterBar.hasFilter(filterName, filterValue, false)).to.eql(true);

      // TODO: Clicking breadcrumbs works differently in Serverless
      await PageObjects.svlCommonNavigation.breadcrumbs.clickBreadcrumb({
        deepLinkId: 'discover',
      });
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await filterBar.getFilterCount()).to.eql(2);
      await checkMainViewFilters();
    });
  });
}
