/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const editedDescription = 'Edited description';

  describe('outlier detection creation', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ihp_outlier');
      await ml.testResources.createIndexPatternIfNeeded('ft_ihp_outlier', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    const testDataList = [
      {
        suiteTitle: 'iowa house prices',
        jobType: 'outlier_detection',
        jobId: `ihp_1_${Date.now()}`,
        jobDescription: 'This is the job description',
        source: 'ft_ihp_outlier',
        get destinationIndex(): string {
          return `user-${this.jobId}`;
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
          scatterplotMatrixColorStatsWizard: [
            // background
            { key: '#000000', value: 91 },
            // tick/grid/axis
            { key: '#6A717D', value: 2 },
            { key: '#F5F7FA', value: 2 },
            { key: '#D3DAE6', value: 1 },
            // scatterplot circles
            { key: '#54B399', value: 1 },
            { key: '#54B39A', value: 1 },
          ],
          scatterplotMatrixColorStatsResults: [
            // background
            { key: '#000000', value: 91 },
            // tick/grid/axis, grey markers
            // the red outlier color is not above the 1% threshold.
            { key: '#6A717D', value: 2 },
            { key: '#98A2B3', value: 1 },
            { key: '#F5F7FA', value: 2 },
            { key: '#D3DAE6', value: 1 },
          ],
          row: {
            type: 'outlier_detection',
            status: 'stopped',
            progress: '100',
          },
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

          await ml.testExecution.logTestStep('does not display the dependent variable input');
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputMissing();

          await ml.testExecution.logTestStep('does not display the training percent input');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputMissing();

          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();

          await ml.testExecution.logTestStep('enables the source data preview histogram charts');
          await ml.dataFrameAnalyticsCreation.enableSourceDataPreviewHistogramCharts();

          await ml.testExecution.logTestStep('displays the source data preview histogram charts');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewHistogramCharts(
            testData.expected.histogramCharts
          );

          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

          await ml.testExecution.logTestStep('displays the scatterplot matrix');
          await ml.dataFrameAnalyticsScatterplot.assertScatterplotMatrix(
            'mlAnalyticsCreateJobWizardScatterplotMatrixFormRow',
            testData.expected.scatterplotMatrixColorStatsWizard
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

          await ml.testExecution.logTestStep('sets the create index pattern switch');
          await ml.dataFrameAnalyticsCreation.assertCreateIndexPatternSwitchExists();
          await ml.dataFrameAnalyticsCreation.setCreateIndexPatternSwitchState(
            testData.createIndexPattern
          );

          await ml.testExecution.logTestStep('continues to the create step');
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
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
            sourceIndex: testData.source,
            destinationIndex: testData.destinationIndex,
            type: testData.expected.row.type,
            status: testData.expected.row.status,
            progress: testData.expected.row.progress,
          });
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
          await ml.dataFrameAnalyticsScatterplot.assertScatterplotMatrix(
            'mlDFExpandableSection-splom',
            testData.expected.scatterplotMatrixColorStatsResults
          );
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
