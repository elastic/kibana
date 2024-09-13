/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIME_RANGE_TYPE } from '@kbn/ml-plugin/public/application/components/custom_urls/custom_url_editor/constants';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { AnalyticsTableRowDetails } from '../../../services/ml/data_frame_analytics_table';
import type { FieldStatsType } from '../common/types';
import {
  type DiscoverUrlConfig,
  type DashboardUrlConfig,
  type OtherUrlConfig,
} from '../../../services/ml/data_frame_analytics_edit';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const editedDescription = 'Edited description';

  const fieldStatsEntries = [
    {
      fieldName: 'g1',
      type: 'number' as FieldStatsType,
      isDependentVariableInput: true,
      isIncludeFieldInput: true,
    },
    {
      fieldName: 'g2',
      type: 'number' as FieldStatsType,
      isIncludeFieldInput: true,
    },
  ];

  const testDiscoverCustomUrl: DiscoverUrlConfig = {
    label: 'Show data',
    indexName: 'ft_egs_regression',
    queryEntityFieldNames: ['stabf'],
    timeRange: TIME_RANGE_TYPE.AUTO,
  };

  const testDashboardCustomUrl: DashboardUrlConfig = {
    label: 'Show dashboard',
    dashboardName: 'ML Test',
    queryEntityFieldNames: ['stabf'],
    timeRange: TIME_RANGE_TYPE.AUTO,
  };

  const testOtherCustomUrl: OtherUrlConfig = {
    label: 'elastic.co',
    url: 'https://www.elastic.co/',
  };

  describe('regression creation', function () {
    let testDashboardId: string | null = null;
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
      await ml.testResources.createDataViewIfNeeded('ft_egs_regression');
      await ml.testResources.setKibanaTimeZoneToUTC();
      testDashboardId = await ml.testResources.createMLTestDashboardIfNeeded();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle('ft_egs_regression');
    });

    const jobId = `egs_1_${Date.now()}`;
    const testDataList = [
      {
        suiteTitle: 'electrical grid stability',
        jobType: 'regression',
        jobId,
        jobDescription: 'Regression job based on ft_egs_regression dataset with runtime fields',
        source: 'ft_egs_regression',
        get destinationIndex(): string {
          return `user-${jobId}`;
        },
        fieldStatsEntries,
        runtimeFields: {
          uppercase_stab: {
            type: 'keyword',
            script: 'emit(params._source.stabf.toUpperCase())',
          },
        },
        dependentVariable: 'stab',
        trainingPercent: 20,
        modelMemory: '20mb',
        createDataView: true,
        advancedEditorContent: [
          '{',
          '  "description": "Regression job based on ft_egs_regression dataset with runtime fields",',
          '  "source": {',
        ],
        expected: {
          scatterplotMatrixColorStats: [
            // some marker colors of the continuous color scale
            { color: '#61AFA3', percentage: 2 },
            { color: '#D1E5E0', percentage: 2 },
            // tick/grid/axis
            { color: '#6A717D', percentage: 5 },
            { color: '#F5F7FA', percentage: 5 },
            { color: '#D3DAE6', percentage: 3 },
          ],
          runtimeFieldsEditorContent: ['{', '  "uppercase_stab": {', '    "type": "keyword",'],
          row: {
            memoryStatus: 'ok',
            type: 'regression',
            status: 'stopped',
            progress: '100',
          },
          rowDetails: {
            jobDetails: [
              {
                section: 'state',
                // Don't include the 'Create time' value entry as it's not stable.
                expectedEntries: [
                  'STOPPED',
                  'Create time',
                  'Model memory limit',
                  '16mb',
                  'Version',
                ],
              },
              {
                section: 'stats',
                // Don't include the 'timestamp' or 'peak usage bytes' value entries as it's not stable.
                expectedEntries: ['Memory usage', 'Timestamp', 'Peak usage bytes', 'Status', 'ok'],
              },
              {
                section: 'counts',
                expectedEntries: [
                  'Data counts',
                  'Training docs',
                  '400',
                  'Test docs',
                  '1600',
                  'Skipped docs',
                  '0',
                ],
              },
              {
                section: 'progress',
                expectedEntries: [
                  'Phase 8/8',
                  'reindexing',
                  '100%',
                  'loading_data',
                  '100%',
                  'feature_selection',
                  '100%',
                  'coarse_parameter_search',
                  '100%',
                  'fine_tuning_parameters',
                  '100%',
                  'final_training',
                  '100%',
                  'writing_results',
                  '100%',
                  'inference',
                  '100%',
                ],
              },
              {
                section: 'analysisStats',
                expectedEntries: {
                  '': '',
                  timestamp: 'February 28th 2023, 22:20:30',
                  timing_stats: '{"elapsed_time":0,"iteration_time":0}',
                  alpha: '0.0001097308602104853',
                  downsample_factor: '1',
                  eta: '0.020888927310242174',
                  eta_growth_rate_per_tree: '1.010444463655121',
                  feature_bag_fraction: '0.6317118309501533',
                  gamma: '0.0000023617026632010964',
                  lambda: '2.668084016785013',
                  max_attempts_to_add_tree: '0',
                  max_optimization_rounds_per_hyperparameter: '2',
                  max_trees: '272',
                  num_folds: '0',
                  num_splits_per_feature: '0',
                  soft_tree_depth_limit: '2',
                  soft_tree_depth_tolerance: '0.15',
                },
              },
            ],
          } as AnalyticsTableRowDetails,
        },
      },
    ];

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        after(async () => {
          await ml.api.deleteIndices(testData.destinationIndex);
          await ml.testResources.deleteDataViewByTitle(testData.destinationIndex);
        });

        it('loads the data frame analytics wizard', async () => {
          await ml.testExecution.logTestStep('loads the data frame analytics page');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();

          await ml.testExecution.logTestStep('loads the source selection modal');

          // Disable anti-aliasing to stabilize canvas image rendering assertions
          await ml.commonUI.disableAntiAliasing();

          await ml.dataFrameAnalytics.startAnalyticsCreation();

          await ml.testExecution.logTestStep(
            'selects the source data and loads the job wizard page'
          );
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(testData.source);
          await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();
        });

        it('navigates through the wizard and sets all needed fields', async () => {
          await ml.testExecution.logTestStep('selects the job type');
          await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
          await ml.dataFrameAnalyticsCreation.selectJobType(testData.jobType);

          await ml.testExecution.logTestStep('displays the runtime mappings editor switch');
          await ml.dataFrameAnalyticsCreation.assertRuntimeMappingSwitchExists();

          await ml.testExecution.logTestStep('enables the runtime mappings editor');
          await ml.dataFrameAnalyticsCreation.toggleRuntimeMappingsEditorSwitch(true);
          await ml.dataFrameAnalyticsCreation.assertRuntimeMappingsEditorContent(['']);

          await ml.testExecution.logTestStep('sets runtime mappings');
          await ml.dataFrameAnalyticsCreation.setRuntimeMappingsEditorContent(
            JSON.stringify(testData.runtimeFields)
          );
          await ml.dataFrameAnalyticsCreation.applyRuntimeMappings();
          await ml.dataFrameAnalyticsCreation.assertRuntimeMappingsEditorContent(
            testData.expected.runtimeFieldsEditorContent
          );

          await ml.testExecution.logTestStep(
            'opens field stats flyout from dependent variable input'
          );
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
          for (const { fieldName, type: fieldType } of fieldStatsEntries.filter(
            (e) => e.isDependentVariableInput
          )) {
            await ml.dataFrameAnalyticsCreation.assertFieldStatsFlyoutContentFromDependentVariableInputTrigger(
              fieldName,
              fieldType
            );
          }

          await ml.testExecution.logTestStep('inputs the dependent variable');
          await ml.dataFrameAnalyticsCreation.selectDependentVariable(testData.dependentVariable);

          await ml.testExecution.logTestStep('inputs the training percent');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputExists();
          await ml.dataFrameAnalyticsCreation.setTrainingPercent(testData.trainingPercent);

          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();

          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

          await ml.testExecution.logTestStep('opens field stats flyout from include fields input');
          for (const { fieldName, type: fieldType } of fieldStatsEntries.filter(
            (e) => e.isIncludeFieldInput
          )) {
            await ml.dataFrameAnalyticsCreation.assertFieldStatFlyoutContentFromIncludeFieldTrigger(
              fieldName,
              fieldType
            );
          }

          await ml.testExecution.logTestStep(
            'sets the sample size to 10000 for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsCreation.setScatterplotMatrixSampleSizeSelectValue('10000');

          await ml.testExecution.logTestStep(
            'sets the randomize query switch to true for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsCreation.setScatterplotMatrixRandomizeQueryCheckState(true);

          await ml.testExecution.logTestStep('displays the scatterplot matrix');
          await ml.dataFrameAnalyticsCreation.assertScatterplotMatrix(
            testData.expected.scatterplotMatrixColorStats
          );

          await ml.testExecution.logTestStep('continues to the additional options step');
          await ml.dataFrameAnalyticsCreation.continueToAdditionalOptionsStep();

          await ml.testExecution.logTestStep('accepts the suggested model memory limit');
          await ml.dataFrameAnalyticsCreation.assertModelMemoryInputExists();
          await ml.dataFrameAnalyticsCreation.assertModelMemoryInputPopulated();

          await ml.testExecution.logTestStep('continues to the details step');
          await ml.dataFrameAnalyticsCreation.continueToDetailsStep();

          await ml.testExecution.logTestStep('inputs the job id');
          await ml.dataFrameAnalyticsCreation.assertJobIdInputExists();
          await ml.dataFrameAnalyticsCreation.setJobId(testData.jobId);

          await ml.testExecution.logTestStep('inputs the job description');
          await ml.dataFrameAnalyticsCreation.assertJobDescriptionInputExists();
          await ml.dataFrameAnalyticsCreation.setJobDescription(testData.jobDescription);

          await ml.testExecution.logTestStep(
            'should default the set destination index to job id switch to true'
          );
          await ml.dataFrameAnalyticsCreation.assertDestIndexSameAsIdSwitchExists();
          await ml.dataFrameAnalyticsCreation.assertDestIndexSameAsIdCheckState(true);

          await ml.testExecution.logTestStep('should input the destination index');
          await ml.dataFrameAnalyticsCreation.setDestIndexSameAsIdCheckState(false);
          await ml.dataFrameAnalyticsCreation.assertDestIndexInputExists();
          await ml.dataFrameAnalyticsCreation.setDestIndex(testData.destinationIndex);

          await ml.testExecution.logTestStep('displays the create data view switch');
          await ml.dataFrameAnalyticsCreation.assertCreateDataViewSwitchExists();
          await ml.dataFrameAnalyticsCreation.assertCreateDataViewSwitchCheckState(true);

          await ml.testExecution.logTestStep('continues to the validation step');
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();

          await ml.testExecution.logTestStep('checks validation callouts exist');
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          await ml.dataFrameAnalyticsCreation.assertAllValidationCalloutsPresent(3);

          // switch to json editor and back
          await ml.testExecution.logTestStep('switches to advanced editor then back to form');
          await ml.dataFrameAnalyticsCreation.openAdvancedEditor();
          await ml.dataFrameAnalyticsCreation.assertAdvancedEditorCodeEditorContent(
            testData.advancedEditorContent
          );
          await ml.dataFrameAnalyticsCreation.closeAdvancedEditor();

          await ml.testExecution.logTestStep('continues to the create step');
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
        });

        it('runs the analytics job and displays it correctly in the job list', async () => {
          await ml.testExecution.logTestStep('creates and starts the analytics job');
          await ml.dataFrameAnalyticsCreation.assertCreateButtonExists();
          await ml.dataFrameAnalyticsCreation.assertStartJobSwitchCheckState(true);
          await ml.dataFrameAnalyticsCreation.createAnalyticsJob(testData.jobId);

          await ml.testExecution.logTestStep('finishes analytics processing');
          await ml.dataFrameAnalytics.waitForAnalyticsCompletion(testData.jobId);

          await ml.testExecution.logTestStep('displays the analytics table');
          await ml.dataFrameAnalyticsCreation.navigateToJobManagementPage();
          await ml.dataFrameAnalytics.assertAnalyticsTableExists();

          await ml.testExecution.logTestStep('displays the stats bar');
          await ml.dataFrameAnalytics.assertAnalyticsStatsBarExists();

          await ml.testExecution.logTestStep('displays the created job in the analytics table');
          await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.jobId, 1);

          await ml.testExecution.logTestStep(
            'displays details for the created job in the analytics table'
          );
          await ml.dataFrameAnalyticsTable.assertAnalyticsRowFields(testData.jobId, {
            id: testData.jobId,
            description: testData.jobDescription,
            memoryStatus: testData.expected.row.memoryStatus,
            sourceIndex: testData.source,
            destinationIndex: testData.destinationIndex,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            progress: testData.expected.row.progress,
          });
          await ml.dataFrameAnalyticsTable.assertAnalyticsRowDetails(
            testData.jobId,
            testData.expected.rowDetails
          );
        });

        it('adds discover custom url to the analytics job', async () => {
          await ml.testExecution.logTestStep('opens edit flyout for discover url');
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('adds discover custom url for the analytics job');
          await ml.dataFrameAnalyticsEdit.addDiscoverCustomUrl(
            testData.jobId,
            testDiscoverCustomUrl
          );
        });

        it('adds dashboard custom url to the analytics job', async () => {
          await ml.testExecution.logTestStep('opens edit flyout for dashboard url');
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('adds dashboard custom url for the analytics job');
          await ml.dataFrameAnalyticsEdit.addDashboardCustomUrl(
            testData.jobId,
            testDashboardCustomUrl,
            {
              index: 1,
              url: `dashboards#/view/${testDashboardId}?_g=(filters:!(),time:(from:'$earliest$',mode:absolute,to:'$latest$'))&_a=(filters:!(),query:(language:kuery,query:'stabf:\"$stabf$\"'))`,
            }
          );
        });

        it('adds other custom url type to the analytics job', async () => {
          await ml.testExecution.logTestStep('opens edit flyout for other url');
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('adds other type custom url for the analytics job');
          await ml.dataFrameAnalyticsEdit.addOtherTypeCustomUrl(testData.jobId, testOtherCustomUrl);
        });

        it('edits the analytics job and displays it correctly in the job list', async () => {
          await ml.testExecution.logTestStep(
            'should open the edit form for the created job in the analytics table'
          );
          await ml.dataFrameAnalyticsTable.openEditFlyout(testData.jobId);

          await ml.testExecution.logTestStep('should input the description in the edit form');
          await ml.dataFrameAnalyticsEdit.assertJobDescriptionEditInputExists();
          await ml.dataFrameAnalyticsEdit.setJobDescriptionEdit(editedDescription);

          await ml.testExecution.logTestStep(
            'should input the model memory limit in the edit form'
          );
          await ml.dataFrameAnalyticsEdit.assertJobMmlEditInputExists();
          await ml.dataFrameAnalyticsEdit.setJobMmlEdit('21mb');

          await ml.testExecution.logTestStep('should submit the edit job form');
          await ml.dataFrameAnalyticsEdit.updateAnalyticsJob();

          await ml.testExecution.logTestStep(
            'displays details for the edited job in the analytics table'
          );
          await ml.dataFrameAnalyticsTable.assertAnalyticsRowFields(testData.jobId, {
            id: testData.jobId,
            description: editedDescription,
            memoryStatus: testData.expected.row.memoryStatus,
            sourceIndex: testData.source,
            destinationIndex: testData.destinationIndex,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            progress: testData.expected.row.progress,
          });

          await ml.testExecution.logTestStep(
            'creates the destination index and writes results to it'
          );
          await ml.api.assertIndicesExist(testData.destinationIndex);
          await ml.api.assertIndicesNotEmpty(testData.destinationIndex);

          await ml.testExecution.logTestStep('displays the results view for created job');
          await ml.dataFrameAnalyticsTable.openResultsView(testData.jobId);
          await ml.dataFrameAnalyticsResults.assertRegressionEvaluatePanelElementsExists();
          await ml.dataFrameAnalyticsResults.assertRegressionTablePanelExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableTrainingFiltersExist();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();

          await ml.testExecution.logTestStep(
            'sets the sample size to 10000 for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsResults.setScatterplotMatrixSampleSizeSelectValue('10000');

          await ml.testExecution.logTestStep(
            'sets the randomize query switch to true for the scatterplot matrix'
          );
          await ml.dataFrameAnalyticsResults.setScatterplotMatrixRandomizeQueryCheckState(true);

          await ml.testExecution.logTestStep('displays the scatterplot matrix');
          await ml.dataFrameAnalyticsResults.assertScatterplotMatrix(
            testData.expected.scatterplotMatrixColorStats
          );

          await ml.commonUI.resetAntiAliasing();
        });

        it('displays the analytics job in the map view', async () => {
          await ml.testExecution.logTestStep('should open the map view for created job');
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalyticsTable.openMapView(testData.jobId);
          await ml.dataFrameAnalyticsMap.assertMapElementsExists();
          await ml.dataFrameAnalyticsMap.assertJobMapTitle(testData.jobId);
        });
      });
    }
  });
}
