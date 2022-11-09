/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { AnalyticsTableRowDetails } from '../../../services/ml/data_frame_analytics_table';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const editedDescription = 'Edited description';

  describe('regression creation', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
      await ml.testResources.createIndexPatternIfNeeded('ft_egs_regression', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_egs_regression');
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
        runtimeFields: {
          uppercase_stab: {
            type: 'keyword',
            script: 'emit(params._source.stabf.toUpperCase())',
          },
        },
        dependentVariable: 'stab',
        trainingPercent: 20,
        modelMemory: '20mb',
        createIndexPattern: true,
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
                expectedEntries: {
                  id: jobId,
                  state: 'stopped',
                  data_counts:
                    '{"training_docs_count":400,"test_docs_count":1600,"skipped_docs_count":0}',
                  description:
                    'Regression job based on ft_egs_regression dataset with runtime fields',
                },
              },
              { section: 'progress', expectedEntries: { Phase: '8/8' } },
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

          await ml.testExecution.logTestStep('inputs the dependent variable');
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
          await ml.dataFrameAnalyticsCreation.selectDependentVariable(testData.dependentVariable);

          await ml.testExecution.logTestStep('inputs the training percent');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputExists();
          await ml.dataFrameAnalyticsCreation.setTrainingPercent(testData.trainingPercent);

          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();

          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

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

          await ml.testExecution.logTestStep('continues to the validation step');
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();

          await ml.testExecution.logTestStep('checks validation callouts exist');
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          await ml.dataFrameAnalyticsCreation.assertAllValidationCalloutsPresent(3);

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
