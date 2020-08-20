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

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('annotations', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);
      // Points the read/write aliases of annotations to an index with wrong mappings
      // so we can simulate errors when requesting annotations.
      await ml.testResources.setupBrokenAnnotationsIndexState(JOB_CONFIG.job_id);
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('displays error on broken annotation index and recovers after fix', async () => {
      await ml.testExecution.logTestStep('loads from job list row link');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.jobTable.waitForJobsToLoad();
      await ml.jobTable.filterWithSearchString(JOB_CONFIG.job_id);
      const rows = await ml.jobTable.parseJobTable();
      expect(rows.filter((row) => row.id === JOB_CONFIG.job_id)).to.have.length(1);

      await ml.jobTable.clickOpenJobInSingleMetricViewerButton(JOB_CONFIG.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('pre-fills the job selection');
      await ml.jobSelection.assertJobSelection([JOB_CONFIG.job_id]);

      await ml.testExecution.logTestStep('pre-fills the detector input');
      await ml.singleMetricViewer.assertDetectorInputExsist();
      await ml.singleMetricViewer.assertDetectorInputValue('0');

      await ml.testExecution.logTestStep('should display the annotations section showing an error');
      await ml.singleMetricViewer.assertAnnotationsExists('error');

      await ml.testExecution.logTestStep('should navigate to anomaly explorer');
      await ml.navigation.navigateToAnomalyExplorerViaSingleMetricViewer();

      await ml.testExecution.logTestStep('should display the annotations section showing an error');
      await ml.anomalyExplorer.assertAnnotationsPanelExists('error');

      await ml.testExecution.logTestStep('should display the annotations section without an error');
      // restores the aliases to point to the original working annotations index
      // so we can run tests against successfully loaded annotations sections.
      await ml.testResources.restoreAnnotationsIndexState();
      await ml.anomalyExplorer.refreshPage();
      await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');

      await ml.testExecution.logTestStep('should navigate to single metric viewer');
      await ml.navigation.navigateToSingleMetricViewerViaAnomalyExplorer();

      await ml.testExecution.logTestStep('should display the annotations section without an error');
      await ml.singleMetricViewer.assertAnnotationsExists('loaded');
    });
  });
}
