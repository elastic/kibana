/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const overallSwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneOverall';
const viewBySwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneViewBy';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const elasticChart = getService('elasticChart');

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
          await elasticChart.setNewChartUiDebugFlag(true);
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
          await ml.jobTable.filterWithSearchString(testData.jobConfig.job_id, 1);

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

        it('renders Overall swim lane', async () => {
          await ml.testExecution.logTestStep('has correct axes labels');
          await ml.swimLane.assertAxisLabels(overallSwimLaneTestSubj, 'x', [
            '2016-02-07 00:00',
            '2016-02-08 00:00',
            '2016-02-09 00:00',
            '2016-02-10 00:00',
            '2016-02-11 00:00',
            '2016-02-12 00:00',
          ]);
          await ml.swimLane.assertAxisLabels(overallSwimLaneTestSubj, 'y', ['Overall']);
        });

        it('renders View By swim lane', async () => {
          await ml.testExecution.logTestStep('has correct axes labels');
          await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'x', [
            '2016-02-07 00:00',
            '2016-02-08 00:00',
            '2016-02-09 00:00',
            '2016-02-10 00:00',
            '2016-02-11 00:00',
            '2016-02-12 00:00',
          ]);
          await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'y', [
            'AAL',
            'VRD',
            'EGF',
            'SWR',
            'AMX',
            'JZA',
            'TRS',
            'ACA',
            'BAW',
            'ASA',
          ]);
        });

        it('supports cell selection by click on Overall swim lane', async () => {
          await ml.testExecution.logTestStep('checking page state before the cell selection');
          await ml.anomalyExplorer.assertClearSelectionButtonVisible(false);
          await ml.anomaliesTable.assertTableRowsCount(25);

          await ml.testExecution.logTestStep('clicks on the Overall swim lane cell');
          const sampleCell = (await ml.swimLane.getCells(overallSwimLaneTestSubj))[0];
          await ml.swimLane.selectSingleCell(overallSwimLaneTestSubj, {
            x: sampleCell.x,
            y: sampleCell.y,
          });
          // TODO extend cell data with X and Y values
          await ml.swimLane.assertSelection(overallSwimLaneTestSubj, {
            x: [1455105600000, 1455120000000],
            y: ['Overall'],
          });
          await ml.anomalyExplorer.assertClearSelectionButtonVisible(true);

          await ml.testExecution.logTestStep('updates the View By swim lane');
          await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'y', ['AMX', 'TRS', 'VRD']);

          await ml.testExecution.logTestStep('renders anomaly explorer charts');
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(6);

          await ml.testExecution.logTestStep('updates top influencers list');
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 3);

          await ml.testExecution.logTestStep('updates anomalies table');
          await ml.anomaliesTable.assertTableRowsCount(11);

          await ml.testExecution.logTestStep('updates the URL state');
          await ml.navigation.assertCurrentURL(
            "/app/ml/explorer?_g=(ml%3A(jobIds%3A!(fq_multi_1_ae))%2CrefreshInterval%3A(display%3AOff%2Cpause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3A'2016-02-07T00%3A00%3A00.000Z'%2Cto%3A'2016-02-11T23%3A59%3A54.000Z'))&_a=(explorer%3A(mlExplorerFilter%3A()%2CmlExplorerSwimlane%3A(selectedLanes%3A!(Overall)%2CselectedTimes%3A!(1455105600%2C1455120000)%2CselectedType%3Aoverall%2CshowTopFieldValues%3A!t%2CviewByFieldName%3Aairline%2CviewByFromPage%3A1%2CviewByPerPage%3A10))%2Cquery%3A(query_string%3A(analyze_wildcard%3A!t%2Cquery%3A'*')))"
          );

          await ml.testExecution.logTestStep('clears the selection');
          await ml.anomalyExplorer.clearSwimLaneSelection();
          await ml.navigation.assertCurrentURL(
            "/app/ml/explorer?_g=(ml%3A(jobIds%3A!(fq_multi_1_ae))%2CrefreshInterval%3A(display%3AOff%2Cpause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3A'2016-02-07T00%3A00%3A00.000Z'%2Cto%3A'2016-02-11T23%3A59%3A54.000Z'))&_a=(explorer%3A(mlExplorerFilter%3A()%2CmlExplorerSwimlane%3A(viewByFieldName%3Aairline%2CviewByFromPage%3A1%2CviewByPerPage%3A10))%2Cquery%3A(query_string%3A(analyze_wildcard%3A!t%2Cquery%3A'*')))"
          );
          await ml.anomalyExplorer.assertClearSelectionButtonVisible(false);
          await ml.anomaliesTable.assertTableRowsCount(25);
        });

        it('support cell selection by click on View By swim lane', async () => {
          await ml.testExecution.logTestStep('clicks on the View By swim lane cell');
          await ml.anomalyExplorer.assertSwimlaneViewByExists();
          await ml.testExecution.logTestStep('check after existance ');
          const sampleCell = (await ml.swimLane.getCells('mlAnomalyExplorerSwimlaneViewBy'))[0];

          await ml.swimLane.selectSingleCell(viewBySwimLaneTestSubj, {
            x: sampleCell.x,
            y: sampleCell.y,
          });

          await ml.swimLane.assertSelection(viewBySwimLaneTestSubj, {
            x: [1455105600000, 1455120000000],
            y: ['AAL'],
          });

          await ml.testExecution.logTestStep('highlights the Overall swim lane');
          await ml.swimLane.assertSelection(overallSwimLaneTestSubj, {
            x: [1455105600000, 1455120000000],
            y: ['Overall'],
          });

          await ml.testExecution.logTestStep('clears the selection');
          await ml.anomalyExplorer.clearSwimLaneSelection();
        });

        it('supports cell selection by brush action', async () => {});

        it('restores cell selection from the URL state', async () => {});

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
