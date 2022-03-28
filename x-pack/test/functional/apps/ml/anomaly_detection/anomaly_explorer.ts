/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';

// @ts-expect-error not full interface
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

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_ae',
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

const cellSize = 15;

const overallSwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneOverall';
const viewBySwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneViewBy';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const elasticChart = getService('elasticChart');

  describe('anomaly explorer', function () {
    this.tags(['mlqa']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createMLTestDashboardIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteMLTestDashboard();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
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
          await elasticChart.setNewChartUiDebugFlag(false);
          await ml.api.cleanMlIndices();
        });

        it('opens a job from job list link', async () => {
          await ml.testExecution.logTestStep('navigate to job list');
          await ml.navigation.navigateToMl();
          // Set debug state has to happen at this point
          // because page refresh happens after navigation to the ML app.
          await elasticChart.setNewChartUiDebugFlag(true);
          await ml.navigation.navigateToJobManagement();

          await ml.testExecution.logTestStep('open job in anomaly explorer');
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
          // The showTimeline prop is set to false and no axis labels are rendered
          await ml.swimLane.assertAxisLabels(overallSwimLaneTestSubj, 'x', []);
          await ml.swimLane.assertAxisLabels(overallSwimLaneTestSubj, 'y', ['Overall']);
        });

        it('renders View By swim lane', async () => {
          await ml.testExecution.logTestStep('has correct axes labels');
          await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'x', [
            '2016-02-07 00:00',
            '2016-02-07 20:00',
            '2016-02-08 16:00',
            '2016-02-09 12:00',
            '2016-02-10 08:00',
            '2016-02-11 04:00',
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
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(0);

          await ml.testExecution.logTestStep('clicks on the Overall swim lane cell');
          const sampleCell = (await ml.swimLane.getCells(overallSwimLaneTestSubj))[0];
          await ml.swimLane.selectSingleCell(overallSwimLaneTestSubj, {
            x: sampleCell.x + cellSize,
            y: sampleCell.y + cellSize,
          });
          await ml.swimLane.waitForSwimLanesToLoad();

          // TODO extend cell data with X and Y values, and cell width
          await ml.swimLane.assertSelection(overallSwimLaneTestSubj, {
            x: [1454846400000, 1454860800000],
            y: ['Overall'],
          });
          await ml.anomalyExplorer.assertClearSelectionButtonVisible(true);

          await ml.testExecution.logTestStep('updates the View By swim lane');
          await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'y', ['EGF', 'DAL']);

          await ml.testExecution.logTestStep('renders anomaly explorer charts');
          // TODO check why count changed from 4 to 5
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(5);

          await ml.testExecution.logTestStep('updates top influencers list');
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 2);

          await ml.testExecution.logTestStep('updates anomalies table');
          await ml.anomaliesTable.assertTableRowsCount(4);

          await ml.testExecution.logTestStep('updates the URL state');
          await ml.navigation.assertCurrentURLContains(
            'selectedLanes%3A!(Overall)%2CselectedTimes%3A!(1454846400%2C1454860800)%2CselectedType%3Aoverall%2CshowTopFieldValues%3A!t'
          );

          await ml.testExecution.logTestStep('clears the selection');
          await ml.anomalyExplorer.clearSwimLaneSelection();
          await ml.swimLane.waitForSwimLanesToLoad();

          await ml.navigation.assertCurrentURLNotContain(
            'selectedLanes%3A!(Overall)%2CselectedTimes%3A!(1454846400%2C1454860800)%2CselectedType%3Aoverall%2CshowTopFieldValues%3A!t%2CviewByFieldName%3Aairline%2CviewByFromPage%3A1%2CviewByPerPage%3A10'
          );
          await ml.anomaliesTable.assertTableRowsCount(25);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(0);
        });

        it('allows to change the swim lane pagination', async () => {
          await ml.testExecution.logTestStep('checks default pagination');
          await ml.swimLane.assertPageSize(viewBySwimLaneTestSubj, 10);
          await ml.swimLane.assertActivePage(viewBySwimLaneTestSubj, 1);

          await ml.testExecution.logTestStep('updates pagination');
          await ml.swimLane.setPageSize(viewBySwimLaneTestSubj, 5);

          await ml.swimLane.assertAxisLabelCount(viewBySwimLaneTestSubj, 'y', 5);

          await ml.swimLane.selectPage(viewBySwimLaneTestSubj, 3);

          await ml.testExecution.logTestStep('resets pagination');
          await ml.swimLane.setPageSize(viewBySwimLaneTestSubj, 10);
          await ml.swimLane.assertActivePage(viewBySwimLaneTestSubj, 1);
        });

        it('supports cell selection by click on View By swim lane', async () => {
          await ml.testExecution.logTestStep('checking page state before the cell selection');
          await ml.anomalyExplorer.assertClearSelectionButtonVisible(false);
          await ml.anomaliesTable.assertTableRowsCount(25);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(0);

          await ml.testExecution.logTestStep('clicks on the View By swim lane cell');
          await ml.anomalyExplorer.assertSwimlaneViewByExists();
          const sampleCell = (await ml.swimLane.getCells(viewBySwimLaneTestSubj))[0];
          await ml.swimLane.selectSingleCell(viewBySwimLaneTestSubj, {
            x: sampleCell.x + cellSize,
            y: sampleCell.y + cellSize,
          });
          await ml.swimLane.waitForSwimLanesToLoad();

          await ml.testExecution.logTestStep('check page content');
          await ml.swimLane.assertSelection(viewBySwimLaneTestSubj, {
            x: [1454817600000, 1454832000000],
            y: ['AAL'],
          });

          await ml.anomaliesTable.assertTableRowsCount(1);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 1);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(1);

          await ml.testExecution.logTestStep('highlights the Overall swim lane');
          await ml.swimLane.assertSelection(overallSwimLaneTestSubj, {
            x: [1454817600000, 1454832000000],
            y: ['Overall'],
          });

          await ml.testExecution.logTestStep('clears the selection');
          await ml.anomalyExplorer.clearSwimLaneSelection();
          await ml.swimLane.waitForSwimLanesToLoad();

          await ml.anomaliesTable.assertTableRowsCount(25);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(0);
        });

        it('supports cell selection by brush action', async () => {
          await ml.testExecution.logTestStep('checking page state before the cell selection');
          await ml.anomalyExplorer.assertClearSelectionButtonVisible(false);
          await ml.anomaliesTable.assertTableRowsCount(25);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(0);

          await ml.anomalyExplorer.assertSwimlaneViewByExists();
          const cells = await ml.swimLane.getCells(viewBySwimLaneTestSubj);

          const sampleCell1 = cells[0];
          // Get cell from another row
          const sampleCell2 = cells.find((c) => c.y !== sampleCell1.y);

          await ml.swimLane.selectCells(viewBySwimLaneTestSubj, {
            x1: sampleCell1.x + cellSize,
            y1: sampleCell1.y + cellSize,
            x2: sampleCell2!.x + cellSize,
            y2: sampleCell2!.y + cellSize,
          });
          await ml.swimLane.waitForSwimLanesToLoad();

          await ml.swimLane.assertSelection(viewBySwimLaneTestSubj, {
            x: [1454817600000, 1454846400000],
            y: ['AAL', 'VRD'],
          });

          await ml.anomaliesTable.assertTableRowsCount(2);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 2);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(2);

          await ml.testExecution.logTestStep('clears the selection');
          await ml.anomalyExplorer.clearSwimLaneSelection();
          await ml.swimLane.waitForSwimLanesToLoad();

          await ml.anomaliesTable.assertTableRowsCount(25);
          await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(0);
        });

        it('allows to change the anomalies table pagination', async () => {
          await ml.testExecution.logTestStep('displays the anomalies table with default config');
          await ml.anomaliesTable.assertTableExists();
          await ml.anomaliesTable.assertRowsNumberPerPage(25);
          await ml.anomaliesTable.assertTableRowsCount(25);

          await ml.testExecution.logTestStep('updates table pagination');
          await ml.anomaliesTable.setRowsNumberPerPage(10);
          await ml.anomaliesTable.assertTableRowsCount(10);
        });

        it('adds swim lane embeddable to a dashboard', async () => {
          // should be the last step because it navigates away from the Anomaly Explorer page
          await ml.testExecution.logTestStep(
            'should allow to attach anomaly swim lane embeddable to the dashboard'
          );
          await ml.anomalyExplorer.openAddToDashboardControl();
          await ml.anomalyExplorer.addAndEditSwimlaneInDashboard('ML Test');
        });
      });
    }
  });
}
