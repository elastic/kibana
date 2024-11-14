/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { setupMockServer } from '../../../../api_integration/test_suites/common/data_usage/mock_api';
import { interceptRequest } from './intercept_request';
import {
  dataStreamsMockResponse,
  createDataStreams,
  deleteDataStreams,
} from '../../../../api_integration/test_suites/common/data_usage/mock_data';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlManagementPage', 'common']);
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const es = getService('es');
  const mockAutoopsApiService = setupMockServer();
  const driver = getService('__webdriver__');

  describe('Main page', function () {
    this.tags(['skipMKI']);
    let mockApiServer: http.Server;
    before(async () => {
      mockApiServer = mockAutoopsApiService.listen(9000);
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('management');
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('cards-navigation-page');
      });
      await pageObjects.svlManagementPage.assertDataUsageManagementCardExists();
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // create the test data streams
      await createDataStreams(es);
      // we need to mock the data_streams request because it uses the /_metering/stats to get the data streams
      // and those stats are not always readily available after creation of data streams
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
          await pageObjects.common.navigateToApp('management/data/data_usage');
        }
      );
    });

    after(async () => {
      mockApiServer.close();
      await deleteDataStreams(es);
    });

    it('renders data usage page', async () => {
      await retry.waitFor('page to be visible', async () => {
        return await testSubjects.exists('DataUsagePage');
      });
    });
    it('render data streams dropdown list with data streams', async () => {
      await testSubjects.click('data-usage-metrics-filter-dataStreams-popoverButton');
      expect(await testSubjects.exists('data-usage-metrics-filter-dataStreams-popoverList')).to.be(
        true
      );
      const dataStreamElements = await testSubjects.findAll('dataStreams-filter-option');
      expect(dataStreamElements.length).to.be.eql(3);
    });
  });
};
