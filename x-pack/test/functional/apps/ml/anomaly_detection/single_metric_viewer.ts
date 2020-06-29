/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';

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

const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_single_1_smv',
  indices: ['ft_farequote'],
  job_id: 'fq_single_1_smv',
  query: { bool: { must: [{ match_all: {} }] } },
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('single metric viewer', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('loads from job list row link', async () => {
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.jobTable.waitForJobsToLoad();
      await ml.jobTable.filterWithSearchString(JOB_CONFIG.job_id);
      const rows = await ml.jobTable.parseJobTable();
      expect(rows.filter((row) => row.id === JOB_CONFIG.job_id)).to.have.length(1);

      await ml.jobTable.clickOpenJobInSingleMetricViewerButton(JOB_CONFIG.job_id);
      await ml.common.waitForMlLoadingIndicatorToDisappear();
    });

    it('pre-fills the job selection', async () => {
      await ml.jobSelection.assertJobSelection([JOB_CONFIG.job_id]);
    });

    it('pre-fills the detector input', async () => {
      await ml.singleMetricViewer.assertDetectorInputExsist();
      await ml.singleMetricViewer.assertDetectorInputValue('0');
    });

    it('displays the chart', async () => {
      await ml.singleMetricViewer.assertChartExsist();
    });

    it('displays the anomalies table', async () => {
      await ml.anomaliesTable.assertTableExists();
    });

    it('anomalies table is not empty', async () => {
      await ml.anomaliesTable.assertTableNotEmpty();
    });
  });
}
