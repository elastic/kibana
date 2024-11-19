/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import type { AnomalySwimLaneEmbeddableState } from '@kbn/ml-plugin/public';
import { stringHash } from '@kbn/ml-string-hash';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../services/ml/security_common';

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

const JOB_CONFIG_NO_INFLUENCERS: Job = {
  ...JOB_CONFIG,
  job_id: `${JOB_CONFIG.job_id}_no_influencers`,
  analysis_config: {
    ...JOB_CONFIG.analysis_config,
    influencers: [],
  },
};

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_ae',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_ae',
  query: { bool: { must: [{ match_all: {} }] } },
};

const DATAFEED_CONFIG_NO_INFLUENCERS: Datafeed = {
  ...DATAFEED_CONFIG,
  datafeed_id: `datafeed-${JOB_CONFIG_NO_INFLUENCERS.job_id}`,
  job_id: JOB_CONFIG_NO_INFLUENCERS.job_id,
};

const testDataListWithInfluencers = [
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

const testDataListWithNoInfluencers = [
  {
    suiteSuffix: 'with no influencers',
    jobConfig: JOB_CONFIG_NO_INFLUENCERS,
    datafeedConfig: DATAFEED_CONFIG_NO_INFLUENCERS,
    expected: {
      influencers: [],
    },
  },
];

const cellSize = 15;

const overallSwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneOverall';
const viewBySwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneViewBy';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'timePicker']);

  describe('anomaly explorer', function () {
    this.tags(['ml']);
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createMLTestDashboardIfNeeded();
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.testResources.deleteMLTestDashboard();
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    describe('with influencers', function () {
      for (const testData of testDataListWithInfluencers) {
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

            await ml.testExecution.logTestStep('displays the swim lanes');
            await ml.anomalyExplorer.assertOverallSwimlaneExists();
            await ml.anomalyExplorer.assertSwimlaneViewByExists();

            await ml.testExecution.logTestStep('should display the annotations panel');
            await ml.anomalyExplorer.assertAnnotationsPanelExists('loaded');

            await ml.testExecution.logTestStep('displays the anomalies table');
            await ml.anomaliesTable.assertTableExists();

            await ml.testExecution.logTestStep('anomalies table is not empty');
            await ml.anomaliesTable.assertTableNotEmpty();
          });

          it('should allow filtering by influencer', async () => {
            const fieldName = testData.expected.influencers[0].field;
            const fieldValue = testData.expected.influencers[0].labelsContained[0];

            await ml.testExecution.logTestStep(
              'adds influencer filter by clicking on the influencer add filter button'
            );
            await ml.anomalyExplorer.addFilterForInfluencer(fieldName, fieldValue);
            await ml.testExecution.logTestStep('query bar and table rows reflect filter');
            await ml.anomalyExplorer.assertQueryBarContent(`${fieldName}:"${fieldValue}"`);
            await ml.anomaliesTable.assertInfluencersCellsContainFilter(
              `${fieldName}: ${fieldValue}`
            );
            await ml.testExecution.logTestStep('influencers list and swimlane reflect filter');
            await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'y', [fieldValue]);
            await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 1);
            await ml.testExecution.logTestStep(
              'removes influencer filter by clicking on the influencer remove filter button'
            );
            await ml.anomalyExplorer.removeFilterForInfluencer(fieldName, fieldValue);
            await ml.testExecution.logTestStep('query bar reflects filter removal');
            await ml.anomalyExplorer.assertQueryBarContent('');
            await ml.testExecution.logTestStep(
              'influencers list and swimlane reflect filter removal'
            );
            await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'y', [
              'AAL',
              'EGF',
              'VRD',
              'SWR',
              'JZA',
              'AMX',
              'TRS',
              'ACA',
              'BAW',
              'ASA',
            ]);
            await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 10);
          });

          it('has enabled Single Metric Viewer button', async () => {
            await ml.anomalyExplorer.assertSingleMetricViewerButtonEnabled(true);
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
              'EGF',
              'VRD',
              'SWR',
              'JZA',
              'AMX',
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
            await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(5);

            await ml.testExecution.logTestStep('updates top influencers list');
            await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 2);

            await ml.testExecution.logTestStep('updates anomalies table');
            await ml.anomaliesTable.assertTableRowsCount(4);

            await ml.testExecution.logTestStep('updates the URL state');
            await ml.navigation.assertCurrentURLContains(
              'selectedLanes%3A!(Overall)%2CselectedTimes%3A!(1454846400%2C1454860800)%2CselectedType%3Aoverall%2CshowTopFieldValues%3A!t'
            );

            await ml.testExecution.logTestStep('restores app state from the URL state');
            await browser.refresh();
            await elasticChart.setNewChartUiDebugFlag(true);
            await ml.swimLane.waitForSwimLanesToLoad();
            await ml.swimLane.assertSelection(overallSwimLaneTestSubj, {
              x: [1454846400000, 1454860800000],
              y: ['Overall'],
            });
            await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'y', ['EGF', 'DAL']);
            await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(5);
            await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 2);
            await ml.anomaliesTable.assertTableRowsCount(4);

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

            await ml.testExecution.logTestStep('restores app state from the URL state');
            await browser.refresh();
            await elasticChart.setNewChartUiDebugFlag(true);
            await ml.swimLane.waitForSwimLanesToLoad();
            await ml.swimLane.assertSelection(viewBySwimLaneTestSubj, {
              x: [1454817600000, 1454832000000],
              y: ['AAL'],
            });
            await ml.anomaliesTable.assertTableRowsCount(1);
            await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 1);
            await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(1);
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
              x: [1454817600000, 1454860800000],
              y: ['AAL', 'EGF'],
            });

            await ml.anomaliesTable.assertTableRowsCount(3);
            await ml.anomalyExplorer.assertInfluencerFieldListLength('airline', 2);
            await ml.anomalyExplorer.assertAnomalyExplorerChartsCount(3);

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

          it('renders swim lanes correctly on the time bounds change', async () => {
            const fromTime = 'Jul 7, 2012 @ 00:00:00.000';
            const toTime = 'Feb 12, 2016 @ 23:59:54.000';

            await PageObjects.timePicker.pauseAutoRefresh();
            await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

            await ml.commonUI.waitForDatePickerIndicatorLoaded();

            await ml.swimLane.waitForSwimLanesToLoad();
            await ml.swimLane.assertAxisLabels(viewBySwimLaneTestSubj, 'x', [
              '2012-06-19',
              '2012-11-16',
              '2013-04-15',
              '2013-09-12',
              '2014-02-09',
              '2014-07-09',
              '2014-12-06',
              '2015-05-05',
              '2015-10-02',
            ]);
          });

          describe('Anomaly Swim Lane as embeddable', function () {
            beforeEach(async () => {
              await ml.navigation.navigateToAnomalyExplorer(testData.jobConfig.job_id, {
                from: '2016-02-07T00%3A00%3A00.000Z',
                to: '2016-02-11T23%3A59%3A54.000Z',
              });
              await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
              await ml.commonUI.waitForDatePickerIndicatorLoaded();
            });

            it('attaches swim lane embeddable to a case', async () => {
              await ml.anomalyExplorer.attachSwimLaneToCase('viewBy', {
                title: 'ML Test case',
                description: 'Case with an anomaly swim lane',
                tag: 'ml_swim_lane_case',
              });

              const expectedAttachment = {
                swimlaneType: 'viewBy',
                viewBy: 'airline',
                jobIds: [testData.jobConfig.job_id],
                timeRange: {
                  from: '2016-02-07T00:00:00.000Z',
                  to: '2016-02-11T23:59:54.000Z',
                },
              } as AnomalySwimLaneEmbeddableState;

              expectedAttachment.id = stringHash(JSON.stringify(expectedAttachment)).toString();

              await ml.cases.assertCaseWithAnomalySwimLaneAttachment(
                {
                  title: 'ML Test case',
                  description: 'Case with an anomaly swim lane',
                  tag: 'ml_swim_lane_case',
                  reporter: USER.ML_POWERUSER,
                },
                expectedAttachment,
                {
                  yAxisLabelCount: 10,
                }
              );
            });

            it('adds swim lane embeddable to a dashboard', async () => {
              await ml.testExecution.logTestStep(
                'should allow to attach anomaly swim lane embeddable to the dashboard'
              );
              await ml.anomalyExplorer.openAddToDashboardControl();
              await ml.anomalyExplorer.addAndEditSwimlaneInDashboard('ML Test');
            });
          });

          describe('Anomaly Charts as embeddable', function () {
            beforeEach(async () => {
              await ml.navigation.navigateToAnomalyExplorer(
                testData.jobConfig.job_id,
                {
                  from: '2016-02-07T00%3A00%3A00.000Z',
                  to: '2016-02-11T23%3A59%3A54.000Z',
                },
                () => elasticChart.setNewChartUiDebugFlag(true)
              );

              await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
              await ml.commonUI.waitForDatePickerIndicatorLoaded();

              await ml.testExecution.logTestStep('clicks on the Overall swim lane cell');
              const sampleCell = (await ml.swimLane.getCells(overallSwimLaneTestSubj))[0];
              await ml.swimLane.selectSingleCell(overallSwimLaneTestSubj, {
                x: sampleCell.x + cellSize,
                y: sampleCell.y + cellSize,
              });
              await ml.swimLane.waitForSwimLanesToLoad();
            });

            it('attaches an embeddable to a case', async () => {
              await ml.anomalyExplorer.attachAnomalyChartsToCase({
                title: 'ML Charts Test case',
                description: 'Case with an anomaly charts attachment',
                tag: 'ml_anomaly_charts',
              });

              const expectedAttachment = {
                jobIds: [testData.jobConfig.job_id],
                maxSeriesToPlot: 6,
              };

              // @ts-expect-error Setting id to be undefined here
              // since time range expected is of the chart plotEarliest/plotLatest, not of the global time range
              // but, chart time range might vary depends on the time of the test
              // we don't know the hashed string id for sure
              expectedAttachment.id = undefined;

              await ml.cases.assertCaseWithAnomalyChartsAttachment(
                {
                  title: 'ML Charts Test case',
                  description: 'Case with an anomaly charts attachment',
                  tag: 'ml_anomaly_charts',
                  reporter: USER.ML_POWERUSER,
                },
                expectedAttachment,
                6
              );
            });
          });

          describe('Use anomaly table action to view in Discover', function () {
            beforeEach(async () => {
              await ml.navigation.navigateToAnomalyExplorer(
                testData.jobConfig.job_id,
                {
                  from: '2016-02-07T00%3A00%3A00.000Z',
                  to: '2016-02-11T23%3A59%3A54.000Z',
                },
                () => elasticChart.setNewChartUiDebugFlag(true)
              );

              await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
              await ml.commonUI.waitForDatePickerIndicatorLoaded();
              await ml.swimLane.waitForSwimLanesToLoad();
            });

            it('should render the anomaly table', async () => {
              await ml.testExecution.logTestStep('displays the anomalies table');
              await ml.anomaliesTable.assertTableExists();

              await ml.testExecution.logTestStep('anomalies table is not empty');
              await ml.anomaliesTable.assertTableNotEmpty();
            });

            it('should click the Discover action in the anomaly table', async () => {
              await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
              await ml.anomaliesTable.scrollRowIntoView(0);
              await ml.anomaliesTable.assertAnomalyActionsMenuButtonEnabled(0, true);
              await ml.anomaliesTable.assertAnomalyActionDiscoverButtonExists(0);
              await ml.anomaliesTable.ensureAnomalyActionDiscoverButtonClicked(0);
            });
          });
        });
      }
    });
    describe('with no influencers', function () {
      for (const testData of testDataListWithNoInfluencers) {
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

        it('should not display the influencers panel', async () => {
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
          await ml.jobSelection.assertJobSelection([testData.jobConfig.job_id]);

          await ml.testExecution.logTestStep('does not display the influencers list');
          await ml.anomalyExplorer.assertInfluencerListDoesNotExist();
        });
      }
    });
  });
}
