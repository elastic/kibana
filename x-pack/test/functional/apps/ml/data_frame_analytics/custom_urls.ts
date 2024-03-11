/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_TYPE } from '@kbn/ml-plugin/public/application/components/custom_urls/custom_url_editor/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  type DiscoverUrlConfig,
  type DashboardUrlConfig,
  type OtherUrlConfig,
} from '../../../services/ml/data_frame_analytics_edit';

const testDiscoverCustomUrl: DiscoverUrlConfig = {
  label: 'Show data',
  indexName: 'ft_farequote',
  queryEntityFieldNames: ['airline'],
  timeRange: TIME_RANGE_TYPE.AUTO,
};

const testDashboardCustomUrl: DashboardUrlConfig = {
  label: 'Show dashboard',
  dashboardName: 'ML Test',
  queryEntityFieldNames: ['airline'],
  timeRange: TIME_RANGE_TYPE.INTERVAL,
  timeRangeInterval: '1h',
};

const testOtherCustomUrl: OtherUrlConfig = {
  label: 'elastic.co',
  url: 'https://www.elastic.co/',
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const browser = getService('browser');

  describe('custom urls', function () {
    const dfaJobId = `fq_regression_${Date.now()}`;
    const generateDestinationIndex = (analyticsId: string) => `user-${analyticsId}`;
    let testDashboardId: string | null = null;
    const dfaJobConfig = {
      id: dfaJobId,
      description: 'Regression job based on farequote dataset',
      source: {
        index: ['ft_farequote'],
        query: {
          match_all: {},
        },
      },
      dest: {
        index: generateDestinationIndex(dfaJobId),
        results_field: 'ml',
      },
      analysis: {
        regression: {
          dependent_variable: 'responsetime',
          training_percent: 50,
        },
      },
      analyzed_fields: {
        includes: [],
        excludes: [],
      },
      model_memory_limit: '20mb',
    };

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
      await ml.api.createAndRunDFAJob(dfaJobConfig, 3 * 60 * 1000);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices('user-farequote_small');
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    describe('run custom urls', function () {
      before(async () => {
        testDashboardId = await ml.testResources.createMLTestDashboardIfNeeded();
      });

      it('opens the custom URLs tab in the edit job flyout', async () => {
        await ml.testExecution.logTestStep('load the analytics management page');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataFrameAnalytics();
        await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();

        await ml.testExecution.logTestStep('open the custom URLs tab in the edit job flyout');
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.openEditCustomUrlsForJobTab(dfaJobId);
        await ml.dataFrameAnalyticsEdit.closeEditJobFlyout();
      });

      it('adds a custom URL with query entities to Discover in the edit job flyout', async () => {
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.addDiscoverCustomUrl(dfaJobId, testDiscoverCustomUrl);
      });

      it('adds a custom URL to Dashboard in the edit job flyout', async () => {
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.addDashboardCustomUrl(dfaJobId, testDashboardCustomUrl, {
          index: 1,
          url: `dashboards#/view/${testDashboardId}?_g=(filters:!(),time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:kuery,query:'airline:\"$airline$\"'))`,
        });
      });

      it('adds a custom URL to an external page in the edit job flyout', async () => {
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.addOtherTypeCustomUrl(dfaJobId, testOtherCustomUrl);
      });

      it('tests other type custom URL', async () => {
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.openEditCustomUrlsForJobTab(dfaJobId);
        await ml.dataFrameAnalyticsEdit.testOtherTypeCustomUrlAction(2, testOtherCustomUrl.url);
      });

      it('edits other type custom URL', async () => {
        const edit = {
          label: `${testOtherCustomUrl.url} edited`,
          url: `${testOtherCustomUrl.url}guide/index.html`,
        };
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.openEditCustomUrlsForJobTab(dfaJobId);
        await ml.testExecution.logTestStep('edit the custom URL in the edit job flyout');
        await ml.dataFrameAnalyticsEdit.editCustomUrl(2, edit);

        await ml.testExecution.logTestStep('tests custom URL edit has been applied');
        await ml.dataFrameAnalyticsEdit.testOtherTypeCustomUrlAction(2, edit.url);
      });

      it('deletes a custom URL', async () => {
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.openEditCustomUrlsForJobTab(dfaJobId);
        const beforeCustomUrls = await ml.dataFrameAnalyticsEdit.deleteCustomUrl(dfaJobId, 2);
        // Save the edit and check the custom URL has been deleted.
        await ml.dataFrameAnalyticsEdit.updateAnalyticsJob();
        await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
        await ml.dataFrameAnalyticsEdit.openEditCustomUrlsForJobTab(dfaJobId);
        await ml.dataFrameAnalyticsEdit.assertCustomUrlsLength(beforeCustomUrls - 1);
      });

      // wrapping into own describe to make sure new tab is cleaned up even if test failed
      // see: https://github.com/elastic/kibana/pull/67280#discussion_r430528122
      describe('tests Discover type custom URL', () => {
        let tabsCount = 1;

        it('opens Discover page from test link in the edit job flyout', async () => {
          await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
          await ml.dataFrameAnalyticsEdit.openTestCustomUrl(dfaJobId, 0);
          await browser.switchTab(1);
          tabsCount++;
          await ml.dataFrameAnalyticsEdit.testDiscoverCustomUrlAction(); // Discover has no content for last 15m.
        });

        after(async () => {
          if (tabsCount > 1) {
            await browser.closeCurrentWindow();
            await browser.switchTab(0);
            await ml.dataFrameAnalyticsEdit.closeEditJobFlyout();
          }
        });
      });

      // wrapping into own describe to make sure new tab is cleaned up even if test failed
      // see: https://github.com/elastic/kibana/pull/67280#discussion_r430528122
      describe('tests Dashboard type custom URL', () => {
        let tabsCount = 1;
        const testDashboardPanelCount = 0; // ML Test dashboard has no content.

        it('opens Dashboard page from test link in the edit job flyout', async () => {
          await ml.dataFrameAnalyticsTable.openEditFlyout(dfaJobId);
          await ml.dataFrameAnalyticsEdit.openTestCustomUrl(dfaJobId, 1);
          await browser.switchTab(1);
          tabsCount++;
          await ml.dataFrameAnalyticsEdit.testDashboardCustomUrlAction(testDashboardPanelCount);
        });

        after(async () => {
          if (tabsCount > 1) {
            await browser.closeCurrentWindow();
            await browser.switchTab(0);
            await ml.dataFrameAnalyticsEdit.closeEditJobFlyout();
          }
        });
      });
    });
  });
}
