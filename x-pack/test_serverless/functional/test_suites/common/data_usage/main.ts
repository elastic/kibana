/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { interceptRequest } from './intercept_request';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlManagementPage', 'common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const driver = getService('__webdriver__');
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
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardExists();

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
          //    await pageObjects.common.navigateToApp('management/data/data_usage');
          await pageObjects.svlManagementPage.clickDataUsageManagementCard();
        }
      );
    });

    it('renders data usage page', async () => {
      await retry.waitFor('page to be visible', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return await testSubjects.exists('DataUsagePage');
      });
    });
    it('shows 3 data streams in the filter dropdown', async () => {
      // Click the dropdown button to show the options
      await testSubjects.click('data-usage-metrics-filter-dataStreams-popoverButton');

      // Wait for the dropdown options to appear
      await retry.waitFor('data streams filter options to appear', async () => {
        const options = await testSubjects.findAll('dataStreams-filter-option');
        return options.length === 3; // Wait until exactly 3 options are available
      });

      // Retrieve all the filter options
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
  });
};
