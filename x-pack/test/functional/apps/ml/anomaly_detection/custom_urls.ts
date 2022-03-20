/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { TIME_RANGE_TYPE } from '../../../../../plugins/ml/public/application/jobs/components/custom_url_editor/constants';
import type {
  DiscoverUrlConfig,
  DashboardUrlConfig,
  OtherUrlConfig,
} from '../../../services/ml/job_table';

// @ts-expect-error doesn't implement the full interface
const JOB_CONFIG: Job = {
  job_id: `fq_multi_1_custom_urls`,
  description: 'mean(responsetime) partition=airline on farequote dataset with 30m bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '30m',
    influencers: ['airline'],
    detectors: [{ function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' }],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error doesn't implement the full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_custom_urls',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_custom_urls',
  query: { bool: { must: [{ match_all: {} }] } },
};

const testDiscoverCustomUrl: DiscoverUrlConfig = {
  label: 'Show data',
  indexPattern: 'ft_farequote',
  queryEntityFieldNames: ['airline'],
  timeRange: TIME_RANGE_TYPE.AUTO,
};

const testDashboardCustomUrl: DashboardUrlConfig = {
  label: 'Show dashboard',
  dashboardName: 'ML Test',
  queryEntityFieldNames: [],
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
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createMLTestDashboardIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteMLTestDashboard();
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    it('opens the custom URLs tab in the edit job flyout', async () => {
      await ml.testExecution.logTestStep('load the job management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('open the custom URLs tab in the edit job flyout');
      await ml.jobTable.openEditCustomUrlsForJobTab(JOB_CONFIG.job_id);
      await ml.jobTable.closeEditJobFlyout();
    });

    it('adds a custom URL with query entities to Discover in the edit job flyout', async () => {
      await ml.jobTable.addDiscoverCustomUrl(JOB_CONFIG.job_id, testDiscoverCustomUrl);
    });

    it('adds a custom URL to Dashboard in the edit job flyout', async () => {
      await ml.jobTable.addDashboardCustomUrl(JOB_CONFIG.job_id, testDashboardCustomUrl);
    });

    it('adds a custom URL to an external page in the edit job flyout', async () => {
      await ml.jobTable.addOtherTypeCustomUrl(JOB_CONFIG.job_id, testOtherCustomUrl);
    });

    it('tests other type custom URL', async () => {
      await ml.jobTable.testOtherTypeCustomUrlAction(JOB_CONFIG.job_id, 2, testOtherCustomUrl.url);
    });

    it('edits other type custom URL', async () => {
      const edit = {
        label: `${testOtherCustomUrl.url} edited`,
        url: `${testOtherCustomUrl.url}guide/index.html`,
      };
      await ml.testExecution.logTestStep('edit the custom URL in the edit job flyout');
      await ml.jobTable.editCustomUrl(JOB_CONFIG.job_id, 2, edit);

      await ml.testExecution.logTestStep('tests custom URL edit has been applied');
      await ml.jobTable.testOtherTypeCustomUrlAction(JOB_CONFIG.job_id, 2, edit.url);
      await ml.jobTable.closeEditJobFlyout();
    });

    it('deletes a custom URL', async () => {
      await ml.jobTable.deleteCustomUrl(JOB_CONFIG.job_id, 2);
    });

    // wrapping into own describe to make sure new tab is cleaned up even if test failed
    // see: https://github.com/elastic/kibana/pull/67280#discussion_r430528122
    describe('tests Discover type custom URL', () => {
      let tabsCount = 1;
      const docCountFormatted = '268';

      it('opens Discover page from test link in the edit job flyout', async () => {
        await ml.jobTable.openTestCustomUrl(JOB_CONFIG.job_id, 0);
        await browser.switchTab(1);
        tabsCount++;
        await ml.jobTable.testDiscoverCustomUrlAction(docCountFormatted);
      });

      after(async () => {
        if (tabsCount > 1) {
          await browser.closeCurrentWindow();
          await browser.switchTab(0);
          await ml.jobTable.closeEditJobFlyout();
        }
      });
    });

    // wrapping into own describe to make sure new tab is cleaned up even if test failed
    // see: https://github.com/elastic/kibana/pull/67280#discussion_r430528122
    describe('tests Dashboard type custom URL', () => {
      let tabsCount = 1;
      const testDashboardPanelCount = 0; // ML Test dashboard has no content.

      it('opens Dashboard page from test link in the edit job flyout', async () => {
        await ml.jobTable.openTestCustomUrl(JOB_CONFIG.job_id, 1);
        await browser.switchTab(1);
        tabsCount++;
        await ml.jobTable.testDashboardCustomUrlAction(testDashboardPanelCount);
      });

      after(async () => {
        if (tabsCount > 1) {
          await browser.closeCurrentWindow();
          await browser.switchTab(0);
          await ml.jobTable.closeEditJobFlyout();
        }
      });
    });
  });
}
