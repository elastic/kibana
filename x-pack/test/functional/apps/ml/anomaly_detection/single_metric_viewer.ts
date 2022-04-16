/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';

// @ts-expect-error not full interface
const JOB_CONFIG: Job = {
  job_id: `fq_single_1_smv`,
  description: 'mean(responsetime) on farequote dataset with 15m bucket span',
  groups: ['farequote', 'automated', 'single-metric'],
  analysis_config: {
    bucket_span: '15m',
    influencers: [],
    detectors: [
      {
        function: 'mean',
        field_name: 'responsetime',
      },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '10mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_single_1_smv',
  indices: ['ft_farequote'],
  job_id: 'fq_single_1_smv',
  query: { bool: { must: [{ match_all: {} }] } },
};

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('single metric viewer', function () {
    this.tags(['mlqa']);

    describe('with single metric job', function () {
      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
        await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
        await ml.testResources.setKibanaTimeZoneToUTC();

        await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
        await ml.securityUI.loginAsMlPowerUser();
      });

      after(async () => {
        await ml.api.cleanMlIndices();
        await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      });

      it('opens a job from job list link', async () => {
        await ml.testExecution.logTestStep('navigate to job list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep('open job in single metric viewer');
        await ml.jobTable.filterWithSearchString(JOB_CONFIG.job_id, 1);

        await ml.jobTable.clickOpenJobInSingleMetricViewerButton(JOB_CONFIG.job_id);
        await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
      });

      it('displays job results', async () => {
        await ml.testExecution.logTestStep('pre-fills the job selection');
        await ml.jobSelection.assertJobSelection([JOB_CONFIG.job_id]);

        await ml.testExecution.logTestStep('pre-fills the detector input');
        await ml.singleMetricViewer.assertDetectorInputExist();
        await ml.singleMetricViewer.assertDetectorInputValue('0');

        await ml.testExecution.logTestStep('displays the chart');
        await ml.singleMetricViewer.assertChartExist();

        await ml.testExecution.logTestStep('should display the annotations section');
        await ml.singleMetricViewer.assertAnnotationsExists('loaded');

        await ml.testExecution.logTestStep('displays the anomalies table');
        await ml.anomaliesTable.assertTableExists();

        await ml.testExecution.logTestStep('anomalies table is not empty');
        await ml.anomaliesTable.assertTableNotEmpty();
      });
    });

    describe('with entity fields', function () {
      // @ts-expect-error not full interface
      const jobConfig: Job = {
        job_id: `ecom_01`,
        description:
          'mean(taxless_total_price) over "geoip.city_name" partitionfield=day_of_week on ecommerce dataset with 15m bucket span',
        groups: ['ecommerce', 'automated', 'advanced'],
        analysis_config: {
          bucket_span: '15m',
          detectors: [
            {
              detector_description:
                'mean(taxless_total_price) over "geoip.city_name" partitionfield=day_of_week',
              function: 'mean',
              field_name: 'taxless_total_price',
              over_field_name: 'geoip.city_name',
              partition_field_name: 'day_of_week',
            },
          ],
          influencers: ['day_of_week'],
        },
        data_description: {
          time_field: 'order_date',
          time_format: 'epoch_ms',
        },
        analysis_limits: {
          model_memory_limit: '11mb',
          categorization_examples_limit: 4,
        },
        model_plot_config: { enabled: true },
      };

      // @ts-expect-error not full interface
      const datafeedConfig: Datafeed = {
        datafeed_id: 'datafeed-ecom_01',
        indices: ['ft_ecommerce'],
        job_id: 'ecom_01',
        query: { bool: { must: [{ match_all: {} }] } },
      };

      before(async () => {
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ecommerce');
        await ml.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
        await ml.testResources.setKibanaTimeZoneToUTC();
        await ml.api.createAndRunAnomalyDetectionLookbackJob(jobConfig, datafeedConfig);
        await ml.securityUI.loginAsMlPowerUser();
      });

      after(async () => {
        await ml.api.cleanMlIndices();
        await ml.testResources.deleteIndexPatternByTitle('ft_ecommerce');
      });

      it('opens a job from job list link', async () => {
        await ml.testExecution.logTestStep('navigate to job list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep('open job in single metric viewer');
        await ml.jobTable.filterWithSearchString(jobConfig.job_id, 1);

        await ml.jobTable.clickOpenJobInSingleMetricViewerButton(jobConfig.job_id);
        await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
      });

      it('render entity control', async () => {
        await ml.testExecution.logTestStep('pre-fills the detector input');
        await ml.singleMetricViewer.assertDetectorInputExist();
        await ml.singleMetricViewer.assertDetectorInputValue('0');

        await ml.testExecution.logTestStep('should input entities values');
        await ml.singleMetricViewer.assertEntityInputExist('day_of_week');
        await ml.singleMetricViewer.assertEntityInputSelection('day_of_week', []);
        await ml.singleMetricViewer.selectEntityValue('day_of_week', 'Friday');
        await ml.singleMetricViewer.assertEntityInputExist('geoip.city_name');
        await ml.singleMetricViewer.assertEntityInputSelection('geoip.city_name', []);
        await ml.singleMetricViewer.selectEntityValue('geoip.city_name', 'Abu Dhabi');

        // TODO if placed before combobox update, tests fail to update combobox values
        await ml.testExecution.logTestStep('assert the default state of entity configs');
        await ml.singleMetricViewer.assertEntityConfig(
          'day_of_week',
          true,
          'anomaly_score',
          'desc'
        );

        await ml.singleMetricViewer.assertEntityConfig(
          'geoip.city_name',
          true,
          'anomaly_score',
          'desc'
        );

        await ml.testExecution.logTestStep('modify the entity config');
        await ml.singleMetricViewer.setEntityConfig('geoip.city_name', false, 'name', 'asc');

        // Make sure anomalous only control has been synced.
        // Also sorting by name is enforced because the model plot is enabled
        // and anomalous only is disabled
        await ml.singleMetricViewer.assertEntityConfig('day_of_week', false, 'name', 'desc');

        await ml.testExecution.logTestStep('displays the chart');
        await ml.singleMetricViewer.assertChartExist();

        await ml.testExecution.logTestStep('displays the anomalies table');
        await ml.anomaliesTable.assertTableExists();

        await ml.testExecution.logTestStep('anomalies table is not empty');
        await ml.anomaliesTable.assertTableNotEmpty();
      });
    });
  });
}
