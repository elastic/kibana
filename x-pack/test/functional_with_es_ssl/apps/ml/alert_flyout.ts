/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATAFEED_STATE } from '../../../../plugins/ml/common/constants/states';

function createTestJobAndDatafeed() {
  const timestamp = Date.now();
  const jobId = `ec-high_sum_total_sales_${timestamp}`;

  return {
    job: {
      job_id: jobId,
      description: 'test_job_annotation',
      groups: ['ecommerce'],
      analysis_config: {
        bucket_span: '1h',
        detectors: [
          {
            detector_description: 'High total sales',
            function: 'high_sum',
            field_name: 'taxful_total_price',
            over_field_name: 'customer_full_name.keyword',
            detector_index: 0,
          },
        ],
        influencers: ['customer_full_name.keyword', 'category.keyword'],
      },
      data_description: {
        time_field: 'order_date',
        time_format: 'epoch_ms',
      },
      analysis_limits: {
        model_memory_limit: '13mb',
        categorization_examples_limit: 4,
      },
    },
    datafeed: {
      datafeed_id: `datafeed-${jobId}`,
      job_id: jobId,
      query: {
        bool: {
          must: [
            {
              match_all: {},
            },
          ],
          filter: [],
          must_not: [],
        },
      },
      query_delay: '120s',
      indices: ['ft_ecommerce'],
    } as unknown as estypes.MlDatafeed,
  };
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const pageObjects = getPageObjects(['triggersActionsUI']);

  let testJobId = '';

  describe('anomaly detection alert', function () {
    this.tags('ciGroup13');

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();

      const { job, datafeed } = createTestJobAndDatafeed();

      testJobId = job.job_id;

      // Set up jobs
      // @ts-expect-error not full interface
      await ml.api.createAnomalyDetectionJob(job);
      await ml.api.openAnomalyDetectionJob(job.job_id);
      await ml.api.createDatafeed(datafeed);
      await ml.api.startDatafeed(datafeed.datafeed_id);
      await ml.api.waitForDatafeedState(datafeed.datafeed_id, DATAFEED_STATE.STARTED);
      await ml.api.assertJobResultsExist(job.job_id);
    });

    after(async () => {
      await ml.api.deleteAnomalyDetectionJobES(testJobId);
      await ml.api.cleanMlIndices();
      await ml.alerting.cleanAnomalyDetectionRules();
    });

    describe('overview page alert flyout controls', () => {
      it('can create an anomaly detection alert', async () => {
        await ml.navigation.navigateToAlertsAndAction();
        await pageObjects.triggersActionsUI.clickCreateAlertButton();
        await ml.alerting.selectAnomalyDetectionAlertType();

        await ml.testExecution.logTestStep('should have correct default values');
        await ml.alerting.assertSeverity(75);
        await ml.alerting.assertPreviewButtonState(false);

        await ml.testExecution.logTestStep('should complete the alert params');
        await ml.alerting.selectJobs([testJobId]);
        await ml.alerting.selectResultType('record');
        await ml.alerting.setSeverity(10);

        await ml.testExecution.logTestStep('should populate advanced settings with default values');
        await ml.alerting.assertTopNBuckets(1);
        await ml.alerting.assertLookbackInterval('123m');

        await ml.testExecution.logTestStep('should preview the alert condition');
        await ml.alerting.assertPreviewButtonState(false);
        await ml.alerting.setTestInterval('5y');
        await ml.alerting.assertPreviewButtonState(true);

        // don't check the exact number provided by the backend, just make sure it's > 0
        await ml.alerting.checkPreview(/Found [1-9]\d* anomal(y|ies) in the last 5y/);

        await ml.testExecution.logTestStep('should create an alert');
        await pageObjects.triggersActionsUI.setAlertName('ml-test-alert');
        await pageObjects.triggersActionsUI.setAlertInterval(10, 's');
        await pageObjects.triggersActionsUI.saveAlert();
        await pageObjects.triggersActionsUI.clickOnAlertInAlertsList('ml-test-alert');
      });
    });
  });
};
