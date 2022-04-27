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
  description: 'count() on farequote dataset with 15m bucket span',
  groups: ['farequote', 'automated', 'single-metric'],
  analysis_config: {
    bucket_span: '15m',
    influencers: [],
    detectors: [
      {
        function: 'count',
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

  describe('forecasts', function () {
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

        await ml.testExecution.logTestStep('should not display the forecasts toggle checkbox');
        await ml.forecast.assertForecastCheckboxMissing();

        await ml.testExecution.logTestStep('should open the forecasts modal');
        await ml.forecast.assertForecastButtonExists();
        await ml.forecast.assertForecastButtonEnabled(true);
        await ml.forecast.openForecastModal();
        await ml.forecast.assertForecastModalRunButtonEnabled(true);

        await ml.testExecution.logTestStep('should run the forecast and close the modal');
        await ml.forecast.clickForecastModalRunButton();

        await ml.testExecution.logTestStep('should display the forecasts toggle checkbox');
        await ml.forecast.assertForecastCheckboxExists();

        await ml.testExecution.logTestStep(
          'should display the forecast in the single metric chart'
        );
        await ml.forecast.assertForecastChartElementsExists();

        await ml.testExecution.logTestStep('should hide the forecast in the single metric chart');
        await ml.forecast.clickForecastCheckbox();
        await ml.forecast.assertForecastChartElementsHidden();

        await ml.testExecution.logTestStep('should open the forecasts modal and list the forecast');
        await ml.forecast.assertForecastButtonExists();
        await ml.forecast.assertForecastButtonEnabled(true);
        await ml.forecast.openForecastModal();
        await ml.forecast.assertForecastTableExists();
        await ml.forecast.assertForecastTableNotEmpty();
      });
    });
  });
}
