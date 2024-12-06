/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import http from 'http';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { interceptRequest } from './intercept_request';
import { setupMockServer } from '../../../../api_integration/test_suites/common/data_usage/mock_api';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlManagementPage', 'common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const driver = getService('__webdriver__');
  const mockAutoopsApiService = setupMockServer();
  const es = getService('es');
  let mockApiServer: http.Server;

  const dataStreamsMockResponse = [
    {
      name: 'metrics-system.cpu-default',
      storageSizeBytes: 6197,
    },
    {
      name: 'metrics-system.core.total.pct-default',
      storageSizeBytes: 5197,
    },
    {
      name: 'logs-nginx.access-default',
      storageSizeBytes: 1938,
    },
  ];
  describe('Main page', function () {
    this.tags(['skipMKI']);
    before(async () => {
      // create test data streams from the mock data streams response
      // so the metrics api can verify they exist
      for (const { name } of dataStreamsMockResponse) {
        await es.indices.putIndexTemplate({
          name,
          body: {
            index_patterns: [name],
            data_stream: {},
            priority: 200,
          },
        });
        await es.indices.createDataStream({ name });
      }
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardExists();

      // mock external API request to autoops
      mockApiServer = mockAutoopsApiService.listen(9000);

      // intercept the data_streams request to bypass waiting for the metering api to aggregate a response
      // otherwise storage sizes get filtered out if they are 0
      await interceptRequest(
        driver.driver,
        '*data_streams*',
        (responseFactory) => {
          return responseFactory.fulfill({
            responseCode: 200,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
            body: Buffer.from(JSON.stringify(dataStreamsMockResponse)).toString('base64'),
          });
        },
        async () => {
          await pageObjects.svlManagementPage.clickDataUsageManagementCard();
        }
      );
    });
    after(async () => {
      mockApiServer.close();
      for (const { name } of dataStreamsMockResponse) {
        await es.indices.deleteDataStream({ name });
      }
    });

    it('renders data usage page', async () => {
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('DataUsagePage');
      });
    });
    it('shows 3 data streams in the filter dropdown', async () => {
      // Click the dropdown button to show the options
      await testSubjects.click('data-usage-metrics-filter-dataStreams-popoverButton');

      const options = await testSubjects.findAll('dataStreams-filter-option');

      // Assert that exactly 3 elements are present
      expect(options.length).to.eql(3);

      // Assert that each option is checked
      for (const option of options) {
        const ariaChecked = await option.getAttribute('aria-checked');
        expect(ariaChecked).to.be('true');
      }

      // Locate the filter button using its data-test-subj
      const filterButton = await testSubjects.find(
        'data-usage-metrics-filter-dataStreams-popoverButton'
      );

      // Find the badge element within the button (using its CSS class)
      const notificationBadge = await filterButton.findByCssSelector('.euiNotificationBadge');

      // Retrieve the text content of the badge
      const activeFiltersCount = await notificationBadge.getVisibleText();

      // Assert the badge displays the expected count
      expect(activeFiltersCount).to.be('3');
    });
    it('renders charts', async () => {
      // data is coming from the mocked autoops API
      const chartContainer = await testSubjects.find('data-usage-metrics');
      await testSubjects.existOrFail('data-usage-metrics');

      // check 2 charts rendered
      await retry.waitFor('chart to render', async () => {
        const chartStatus = await chartContainer.findAllByCssSelector(
          '.echChartStatus[data-ech-render-complete="true"]'
        );
        return chartStatus.length === 2;
      });
    });
    it('renders legend and actions popover', async () => {
      const ingestRateChart = await testSubjects.find('ingest_rate-chart');
      const storageRetainedChart = await testSubjects.find('storage_retained-chart');

      // Verify legend items for the ingest_rate chart
      const ingestLegendItems = await ingestRateChart.findAllByCssSelector('li.echLegendItem');
      expect(ingestLegendItems.length).to.eql(4); // 3 data streams + 1 Total line series

      const ingestLegendNames = await Promise.all(
        ingestLegendItems.map(async (item) => item.getAttribute('data-ech-series-name'))
      );

      expect(ingestLegendNames.sort()).to.eql(
        [
          'metrics-system.cpu-default',
          'metrics-system.core.total.pct-default',
          'logs-nginx.access-default',
          'Total',
        ].sort()
      );

      const storageLegendItems = await storageRetainedChart.findAllByCssSelector(
        'li.echLegendItem'
      );
      expect(storageLegendItems.length).to.eql(4); // same number of data streams + total line series

      const storageLegendNames = await Promise.all(
        storageLegendItems.map(async (item) => item.getAttribute('data-ech-series-name'))
      );

      expect(storageLegendNames.sort()).to.eql(
        [
          'metrics-system.cpu-default',
          'metrics-system.core.total.pct-default',
          'logs-nginx.access-default',
          'Total',
        ].sort()
      );
      // actions menu
      const firstLegendItem = ingestLegendItems[0];
      const actionButton = await firstLegendItem.findByTestSubject('legendActionButton');
      await actionButton.click();

      // Verify that the popover now appears
      await testSubjects.existOrFail('legendActionPopover');
    });
  });
};
