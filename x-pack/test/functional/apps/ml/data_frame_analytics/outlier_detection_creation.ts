/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';
import type { AnalyticsTableRowDetails } from '../../../services/ml/data_frame_analytics_table';
import type { FieldStatsType } from '../common/types';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const editedDescription = 'Edited description';

  describe('outlier detection creation', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.createIndexPatternIfNeeded('ft_ihp_outlier');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');
    });

    const jobId = `ihp_1_${Date.now()}`;

    const fieldStatsEntries = [
      {
        fieldName: '1stFlrSF',
        type: 'keyword' as FieldStatsType,
        isIncludeFieldInput: true,
      },
    ];

    const testDataList = [
      {
        suiteTitle: 'iowa house prices',
        jobType: 'outlier_detection',
        jobId,
        jobDescription: 'Outlier detection job based on ft_ihp_outlier dataset with runtime fields',
        source: 'ft_ihp_outlier',
        get destinationIndex(): string {
          return `user-${jobId}`;
        },
        runtimeFields: {
          lowercase_central_air: {
            type: 'keyword',
            script: 'emit(params._source.CentralAir.toLowerCase())',
          },
        },
        modelMemory: '5mb',
        createIndexPattern: true,
        expected: {
          histogramCharts: [
            { chartAvailable: true, id: '1stFlrSF', legend: '334 - 4692' },
            { chartAvailable: true, id: 'BsmtFinSF1', legend: '0 - 5644' },
            { chartAvailable: true, id: 'BsmtQual', legend: '0 - 5' },
            { chartAvailable: true, id: 'CentralAir', legend: '2 categories' },
            { chartAvailable: true, id: 'Condition2', legend: '2 categories' },
            { chartAvailable: true, id: 'Electrical', legend: '2 categories' },
            { chartAvailable: true, id: 'ExterQual', legend: '1 - 4' },
            { chartAvailable: true, id: 'Exterior1st', legend: '2 categories' },
            { chartAvailable: true, id: 'Exterior2nd', legend: '3 categories' },
            { chartAvailable: true, id: 'Fireplaces', legend: '0 - 3' },
          ],
          scatterplotMatrixColorsWizard: [
            // markers
            { color: '#5078AA', percentage: 15 },
            // grey boilerplate
            { color: '#69707D', percentage: 12 },
          ],
          scatterplotMatrixColorStatsResults: [
            // outlier markers
            { color: '#BE6E96', percentage: 1 },
            // regular markers
            { color: '#6496BE', percentage: 15 },
            // tick/grid/axis
            { color: '#69707D', percentage: 12 },
            { color: '#D2DCE6', percentage: 10 },
            // anti-aliasing
            { color: '#F5F7FA', percentage: 35 },
          ],
          runtimeFieldsEditorContent: [
            '{',
            '  "lowercase_central_air": {',
            '    "type": "keyword",',
          ],
          row: {
            memoryStatus: 'ok',
            type: 'outlier_detection',
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
                  '2mb',
                  'Version',
                  '8.9.0',
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
                  '1460',
                  'Test docs',
                  '0',
                  'Skipped docs',
                  '0',
                ],
              },
              {
                section: 'progress',
                expectedEntries: [
                  'Phase 4/4',
                  'reindexing',
                  '100%',
                  'loading_data',
                  '100%',
                  'computing_outliers',
                  '100%',
                  'writing_results',
                  '100%',
                ],
              },
              {
                section: 'analysisStats',
                expectedEntries: {
                  '': '',
                  timestamp: 'March 1st 2023, 19:00:41',
                  timing_stats: '{"elapsed_time":49}',
                  n_neighbors: '0',
                  method: 'ensemble',
                  compute_feature_influence: 'true',
                  feature_influence_threshold: '0.1',
                  outlier_fraction: '0.05',
                  standardization_enabled: 'true',
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
          await ml.testResources.deleteIndexPatternByTitle(testData.destinationIndex);
        });

        it('loads the data frame analytics wizard', async () => {
          await ml.testExecution.logTestStep('loads the data frame analytics page');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();

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

          await ml.testExecution.logTestStep('does not display the dependent variable input');
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputMissing();

          await ml.testExecution.logTestStep('does not display the training percent input');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputMissing();

          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewHistogramChartEnabled(true);

          await ml.testExecution.logTestStep('displays the source data preview histogram charts');
          await ml.dataFrameAnalyticsCreation.enableAndAssertSourceDataPreviewHistogramCharts(
            testData.expected.histogramCharts
          );

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
            testData.expected.scatterplotMatrixColorsWizard
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

          await ml.testExecution.logTestStep('continues to the validation step');
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();

          await ml.testExecution.logTestStep('checks validation callouts exist');
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          await ml.dataFrameAnalyticsCreation.assertAllValidationCalloutsPresent(1);

          await ml.testExecution.logTestStep('continues to the create step');
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();

          await ml.testExecution.logTestStep('sets the create data view switch');
          await ml.dataFrameAnalyticsCreation.assertCreateIndexPatternSwitchExists();
          await ml.dataFrameAnalyticsCreation.setCreateIndexPatternSwitchState(
            testData.createIndexPattern
          );
        });

        it('runs the analytics job and displays it correctly in the job list', async () => {
          await ml.testExecution.logTestStep('creates and starts the analytics job');
          await ml.dataFrameAnalyticsCreation.assertCreateButtonExists();
          await ml.dataFrameAnalyticsCreation.assertStartJobCheckboxCheckState(true);
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
          await ml.dataFrameAnalyticsResults.assertOutlierTablePanelExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();
          await ml.dataFrameAnalyticsResults.assertFeatureInfluenceCellNotEmpty();

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
            testData.expected.scatterplotMatrixColorStatsResults
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
