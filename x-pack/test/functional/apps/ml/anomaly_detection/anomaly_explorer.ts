/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';

const JOB_CONFIG: Job = {
  job_id: `fq_multi_1_ae`,
  description:
    'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [
      { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_se',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_ae',
  query: { bool: { must: [{ match_all: {} }] } },
};

const testDataList = [
  {
    suiteSuffix: 'with farequote based multi metric job',
    jobConfig: JOB_CONFIG,
    datafeedConfig: DATAFEED_CONFIG,
    expected: {
      influencers: [
        {
          field: 'airline',
          count: 10,
          labelsContained: ['AAL'],
        },
      ],
    },
  },
];

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('anomaly explorer', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createMLTestDashboardIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    for (const testData of testDataList) {
      describe(testData.suiteSuffix, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it('opens a job from job list link', async () => {
          await ml.testExecution.logTestStep('navigate to job list');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.testExecution.logTestStep('open job in anomaly explorer');
          await ml.jobTable.waitForJobsToLoad();
          await ml.jobTable.filterWithSearchString(testData.jobConfig.job_id);
          const rows = await ml.jobTable.parseJobTable();
          expect(rows.filter((row) => row.id === testData.jobConfig.job_id)).to.have.length(1);

          await ml.jobTable.clickOpenJobInAnomalyExplorerButton(testData.jobConfig.job_id);
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
        });

        it('displays job results', async () => {
          await ml.testExecution.logTestStep('pre-fills the job selection');
          await ml.jobSelection.assertJobSelection([testData.jobConfig.job_id]);

          await ml.testExecution.logTestStep('displays the influencers list');
          await ml.anomalyExplorer.assertInfluencerListExists();
          for (const influencerBlock of testData.expected.influencers) {
            await ml.anomalyExplorer.assertInfluencerFieldExists(influencerBlock.field);
            await ml.anomalyExplorer.assertInfluencerFieldListLength(
              influencerBlock.field,
              influencerBlock.count
            );
            for (const influencerLabel of influencerBlock.labelsContained) {
              await ml.anomalyExplorer.assertInfluencerListContainsLabel(
                influencerBlock.field,
                influencerLabel
              );
            }
          }

          await ml.testExecution.logTestStep('displays the swimlanes');
          await ml.anomalyExplorer.assertOverallSwimlaneExists();
          await ml.anomalyExplorer.assertSwimlaneViewByExists();

          await ml.testExecution.logTestStep('should display the annotations panel');
          await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');

          await ml.testExecution.logTestStep('displays the anomalies table');
          await ml.anomaliesTable.assertTableExists();

          await ml.testExecution.logTestStep('anomalies table is not empty');
          await ml.anomaliesTable.assertTableNotEmpty();
        });

        it('adds swim lane embeddable to a dashboard', async () => {
          // should be the last step because it navigates away from the Anomaly Explorer page
          await ml.testExecution.logTestStep(
            'should allow to attach anomaly swimlane embeddable to the dashboard'
          );
          await ml.anomalyExplorer.openAddToDashboardControl();
          await ml.anomalyExplorer.addAndEditSwimlaneInDashboard('ML Test');
        });
      });
    }
  });
}
