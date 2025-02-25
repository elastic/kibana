/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import http from 'http';
import { InterceptResponseFactory } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { setupMockServer } from '../../../../api_integration/test_suites/common/data_usage/mock_api';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects([
    'svlDataUsagePage',
    'svlCommonPage',
    'svlManagementPage',
    'common',
  ]);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const mockAutoopsApiService = setupMockServer();
  const es = getService('es');
  const browser = getService('browser');
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
          index_patterns: [name],
          data_stream: {},
          priority: 200,
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
      await browser.interceptRequest(
        '*data_streams*',
        (responseFactory: InterceptResponseFactory) => {
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
        return await pageObjects.svlDataUsagePage.assertDataUsagePageExists();
      });
    });
    it('shows 3 data streams in the filter dropdown', async () => {
      // Click the dropdown button to show the options
      await pageObjects.svlDataUsagePage.clickDatastreamsDropdown();

      const options = await pageObjects.svlDataUsagePage.findDatastreamsDropdownOptions();

      // Assert that exactly 3 elements are present
      expect(options.length).to.eql(3);

      // Assert that each option is checked
      for (const option of options) {
        const ariaChecked = await option.getAttribute('aria-checked');
        expect(ariaChecked).to.be('true');
      }

      // Locate the filter button using its data-test-subj
      const datastreamsDropdownFilterButton =
        await pageObjects.svlDataUsagePage.findDatastreamsDropdownFilterButton();

      // Find the badge element within the button (using its CSS class)
      const notificationBadge = await datastreamsDropdownFilterButton.findByCssSelector(
        '.euiNotificationBadge'
      );

      // Retrieve the text content of the badge
      const activeFiltersCount = await notificationBadge.getVisibleText();

      // Assert the badge displays the expected count
      expect(activeFiltersCount).to.be('3');
    });
    it('renders charts', async () => {
      // Data is coming from the mocked autoops API
      const chartContainer = await testSubjects.find('data-usage-metrics');
      await testSubjects.existOrFail('data-usage-metrics');

      // Check 2 charts rendered
      await retry.waitFor('chart to render', async () => {
        const chartStatus = await chartContainer.findAllByCssSelector(
          '.echChartStatus[data-ech-render-complete="true"]'
        );
        return chartStatus.length === 2;
      });
    });
    it('renders legend', async () => {
      const ingestRateChart = await pageObjects.svlDataUsagePage.findIngestRateChart();
      const storageRetainedChart = await pageObjects.svlDataUsagePage.storageRetainedChart();

      const ingestLegendItems = await pageObjects.svlDataUsagePage.findLegendItemsInChart(
        ingestRateChart
      );

      expect(ingestLegendItems.length).to.eql(4); // 3 data streams + 1 Total line series

      const storageLegendItems = await pageObjects.svlDataUsagePage.findLegendItemsInChart(
        storageRetainedChart
      );
      expect(storageLegendItems.length).to.eql(4); // same number of data streams + total line series
    });
    it('renders actions popover with correct links', async () => {
      // Open the first legend item actions popover
      const ingestRateChart = await pageObjects.svlDataUsagePage.findIngestRateChart();
      await pageObjects.svlDataUsagePage.clickLegendActionButtonAtIndex(ingestRateChart, 0);
      await pageObjects.svlDataUsagePage.assertLegendActionPopoverExists();
      // Check for links
      await testSubjects.existOrFail('copyDataStreamNameAction');
      await testSubjects.existOrFail('manageDataStreamAction');
      await testSubjects.existOrFail('DatasetQualityAction');

      const manageLink = await testSubjects.find('manageDataStreamAction');
      await manageLink.click();

      // Wait for navigation to the data stream details page
      await retry.waitFor('URL to update (index management)', async () => {
        const currentUrl = await browser.getCurrentUrl();
        return currentUrl.includes(
          `/app/management/data/index_management/data_streams/${dataStreamsMockResponse[0].name}`
        );
      });
      await browser.goBack();
      // test second link to ensure state changed
      await pageObjects.svlDataUsagePage.clickLegendActionButtonAtIndex(ingestRateChart, 1);
      await pageObjects.svlDataUsagePage.assertLegendActionPopoverExists();

      await manageLink.click();

      // Wait for navigation to the data stream details page
      await retry.waitFor('URL to update (index management)', async () => {
        const currentUrl = await browser.getCurrentUrl();
        return currentUrl.includes(
          `/app/management/data/index_management/data_streams/${dataStreamsMockResponse[1].name}`
        );
      });
      await browser.goBack();

      // Test navigation for the data quality link
      await pageObjects.svlDataUsagePage.clickLegendActionButtonAtIndex(ingestRateChart, 0);
      await pageObjects.svlDataUsagePage.assertLegendActionPopoverExists();
      const dataQualityLink = await testSubjects.find('DatasetQualityAction');
      await dataQualityLink.click();

      // Wait for navigation to the data quality details page
      await retry.waitFor('URL to update (data quality)', async () => {
        const currentUrl = await browser.getCurrentUrl();
        return currentUrl.includes('/app/management/data/data_quality/details');
      });
      await browser.goBack();
    });
  });
};
