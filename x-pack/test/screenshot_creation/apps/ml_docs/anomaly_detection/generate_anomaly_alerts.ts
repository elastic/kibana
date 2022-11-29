/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { DATAFEED_STATE } from '@kbn/ml-plugin/common/constants/states';
import { FtrProviderContext } from '../../ftr_provider_context';

import { ECOMMERCE_INDEX_PATTERN } from '..';

function createTestJobAndDatafeed() {
  const timestamp = Date.now();
  const jobId = `high_sum_total_sales_${timestamp}`;

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