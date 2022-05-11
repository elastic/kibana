/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsTableRowDetails } from '../../../services/ml/data_frame_analytics_table';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const editedDescription = 'Edited description';

  describe('classification saved search creation', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote_small');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote_small', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded('ft_farequote_small');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded('ft_farequote_small');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote_small');
    });

    const dateNow = Date.now();
    const testDataList = [
      {
        suiteTitle: 'with lucene query',
        jobType: 'classification',
        jobId: `fq_saved_search_2_${dateNow}`,
        jobDescription: 'Classification job based on a saved search with lucene query',
        source: 'ft_farequote_lucene',
        get destinationIndex(): string {
          return `user-${this.jobId}`;
        },
        runtimeFields: {
          uppercase_airline: {
            type: 'keyword',
            script: 'emit(params._source.airline.toUpperCase())',
          },
        },
        dependentVariable: 'airline',
        trainingPercent: 20,
        modelMemory: '20mb',
        createIndexPattern: true,
        expected: {
          source: 'ft_farequote_small',
          rocCurveColorState: [
            // tick/grid/axis
            { color: '#DDDDDD', percentage: 38 },
            // line
            { color: '#98A2B3', percentage: 7 },
          ],
          runtimeFieldsEditorContent: ['{', '  "uppercase_airline": {', '    "type": "keyword",'],
          row: {
            memoryStatus: 'ok',
            type: 'classification',
            status: 'stopped',
            progress: '100',
          },
          rowDetails: {
            jobDetails: [
              {
                section: 'state',
                expectedEntries: {
                  id: `fq_saved_search_2_${dateNow}`,
                  state: 'stopped',
                  data_counts:
                    '{"training_docs_count":320,"test_docs_count":1284,"skipped_docs_count":0}',
                  description: 'Classification job based on a saved search with lucene query',
                },
              },
              { section: 'progress', expectedEntries: { Phase: '8/8' } },
            ],
          } as AnalyticsTableRowDetails,
        },
      },
      {
        suiteTitle: 'with kuery query',
        jobType: 'classification',
        jobId: `fq_saved_search_3_${dateNow}`,
        jobDescription: 'Classification job based on a saved search with kuery query',
        source: 'ft_farequote_kuery',
        get destinationIndex(): string {
          return `user-${this.jobId}`;
        },
        runtimeFields: {
          uppercase_airline: {
            type: 'keyword',
            script: 'emit(params._source.airline.toUpperCase())',
          },
        },
        dependentVariable: 'airline',
        trainingPercent: 20,
        modelMemory: '20mb',
        createIndexPattern: true,
        expected: {
          source: 'ft_farequote_small',
          rocCurveColorState: [
            // tick/grid/axis
            { color: '#DDDDDD', percentage: 38 },
            // line
            { color: '#98A2B3', percentage: 7 },
          ],
          runtimeFieldsEditorContent: ['{', '  "uppercase_airline": {', '    "type": "keyword",'],
          row: {
            memoryStatus: 'ok',
            type: 'classification',
            status: 'stopped',
            progress: '100',
          },
          rowDetails: {
            jobDetails: [
              {
                section: 'state',
                expectedEntries: {
                  id: `fq_saved_search_3_${dateNow}`,
                  state: 'stopped',
                  data_counts:
                    '{"training_docs_count":320,"test_docs_count":1283,"skipped_docs_count":0}',
                  description: 'Classification job based on a saved search with kuery query',
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
          // Expect the follow callouts:
          // - ✓ Dependent variable
          // - ✓ Training percent
          // - ✓ Top classes
          // - ⚠ Analysis fields
          await ml.dataFrameAnalyticsCreation.assertAllValidationCalloutsPresent(4);

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
            sourceIndex: testData.expected.source,
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
            sourceIndex: testData.expected.source,
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
          await ml.dataFrameAnalyticsResults.assertClassificationEvaluatePanelElementsExists();
          await ml.dataFrameAnalyticsResults.assertClassificationTablePanelExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableTrainingFiltersExist();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();

          await ml.testExecution.logTestStep('displays the ROC curve chart');
          await ml.commonUI.assertColorsInCanvasElement(
            'mlDFAnalyticsClassificationExplorationRocCurveChart',
            testData.expected.rocCurveColorState,
            ['#000000'],
            undefined,
            undefined,
            // increased tolerance for ROC curve chart up from 10 to 20
            // since the returned colors vary quite a bit on each run.
            20
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
