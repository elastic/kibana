/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const a11y = getService('a11y');
  const ml = getService('ml');

  describe('ml Accessibility', function () {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
    });

    describe('for user with full ML access', function () {
      before(async () => {
        await ml.securityUI.loginAsMlPowerUser();
        await ml.api.cleanMlIndices();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await ml.securityUI.logout();
      });

      describe('with no data loaded', function () {
        it('overview page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToOverview();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics page', async () => {
          await ml.navigation.navigateToDataFrameAnalytics();
          await a11y.testAppSnapshot();
        });
      });

      describe('with data loaded', function () {
        const dfaOutlierResultsJobId = 'iph_outlier_a11y';
        const ecIndexName = 'ft_module_sample_ecommerce';
        const ihpIndexName = 'ft_ihp_outlier';
        const egsIndexName = 'ft_egs_regression';
        const bmIndexName = 'ft_bank_marketing';
        const ecExpectedTotalCount = '287';

        const dfaOutlierJobType = 'outlier_detection';
        const dfaOutlierJobId = `ihp_outlier_ally_${Date.now()}`;
        const dfaRegressionJobType = 'regression';
        const dfaRegressionJobId = `egs_regression_ally_${Date.now()}`;
        const dfaRegressionJobDepVar = 'stab';
        const dfaRegressionJobTrainingPercent = 30;
        const dfaClassificationJobType = 'classification';
        const dfaClassificationJobId = `bm_classification_ally_${Date.now()}`;
        const dfaClassificationJobDepVar = 'y';
        const dfaClassificationJobTrainingPercent = 30;

        const uploadFilePath = require.resolve(
          '../../../functional/apps/ml/data_visualizer/files_to_import/artificial_server_log'
        );

        before(async () => {
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
          await esArchiver.loadIfNeeded(
            'x-pack/test/functional/es_archives/ml/module_sample_ecommerce'
          );
          await ml.testResources.createDataViewIfNeeded(ihpIndexName);
          await ml.testResources.createDataViewIfNeeded(egsIndexName);
          await ml.testResources.createDataViewIfNeeded(bmIndexName);
          await ml.testResources.createDataViewIfNeeded(ecIndexName, 'order_date');
          await ml.testResources.setKibanaTimeZoneToUTC();

          await ml.api.createAndRunDFAJob(
            ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaOutlierResultsJobId)
          );
        });

        after(async () => {
          await ml.api.cleanMlIndices();
          await ml.api.deleteIndices(`user-${dfaOutlierResultsJobId}`);

          await ml.testResources.deleteDataViewByTitle(ihpIndexName);
          await ml.testResources.deleteDataViewByTitle(egsIndexName);
          await ml.testResources.deleteDataViewByTitle(bmIndexName);
          await ml.testResources.deleteDataViewByTitle(ecIndexName);
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/egs_regression');
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');
          await ml.testResources.resetKibanaTimeZone();
        });

        it('overview page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToOverview();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics page', async () => {
          await ml.navigation.navigateToDataFrameAnalytics();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics outlier job exploration page', async () => {
          await ml.dataFrameAnalyticsTable.openResultsView(dfaOutlierResultsJobId);
          await ml.dataFrameAnalyticsResults.assertOutlierTablePanelExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job select index pattern modal', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalytics.startAnalyticsCreation();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job configuration step', async () => {
          await ml.testExecution.logTestStep(
            'job creation selects the source data and loads the DFA job wizard page'
          );
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(ihpIndexName);
          await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job configuration step for outlier job', async () => {
          await ml.testExecution.logTestStep('selects the outlier job type');
          await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
          await ml.dataFrameAnalyticsCreation.selectJobType(dfaOutlierJobType);
          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewHistogramChartEnabled(true);
          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job additional options step for outlier job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToAdditionalOptionsStep();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job additional options step for outlier job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToDetailsStep();
          await ml.dataFrameAnalyticsCreation.setJobId(dfaOutlierJobId);
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job validation step for outlier job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job create step for outlier job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job configuration step for regression job', async () => {
          await ml.testExecution.logTestStep(
            'job creation selects the source data and loads the DFA job wizard page'
          );
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalytics.startAnalyticsCreation();
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(egsIndexName);
          await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();
          await ml.testExecution.logTestStep('selects the regression job type');
          await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
          await ml.dataFrameAnalyticsCreation.selectJobType(dfaRegressionJobType);
          await ml.testExecution.logTestStep('inputs the dependent variable');
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
          await ml.dataFrameAnalyticsCreation.selectDependentVariable(dfaRegressionJobDepVar);
          await ml.testExecution.logTestStep('inputs the training percent');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputExists();
          await ml.dataFrameAnalyticsCreation.setTrainingPercent(dfaRegressionJobTrainingPercent);
          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job additional options step for regression job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToAdditionalOptionsStep();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job additional options step for regression job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToDetailsStep();
          await ml.dataFrameAnalyticsCreation.setJobId(dfaRegressionJobId);
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job validation step for regression job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job create step for regression job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job configuration step for classification job', async () => {
          await ml.testExecution.logTestStep(
            'job creation selects the source data and loads the DFA job wizard page'
          );
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalytics.startAnalyticsCreation();
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(bmIndexName);
          await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();
          await ml.testExecution.logTestStep('selects the classification job type');
          await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
          await ml.dataFrameAnalyticsCreation.selectJobType(dfaClassificationJobType);
          await ml.testExecution.logTestStep('inputs the dependent variable');
          await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
          await ml.dataFrameAnalyticsCreation.selectDependentVariable(dfaClassificationJobDepVar);
          await ml.testExecution.logTestStep('inputs the training percent');
          await ml.dataFrameAnalyticsCreation.assertTrainingPercentInputExists();
          await ml.dataFrameAnalyticsCreation.setTrainingPercent(
            dfaClassificationJobTrainingPercent
          );
          await ml.testExecution.logTestStep('displays the source data preview');
          await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
          await ml.testExecution.logTestStep('displays the include fields selection');
          await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job additional options step for classification job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToAdditionalOptionsStep();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job additional options step for classification job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToDetailsStep();
          await ml.dataFrameAnalyticsCreation.setJobId(dfaClassificationJobId);
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job validation step for classification job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToValidationStep();
          await ml.dataFrameAnalyticsCreation.assertValidationCalloutsExists();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics create job create step for classification job', async () => {
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
          await a11y.testAppSnapshot();
        });

        it('data visualizer selector page', async () => {
          await ml.navigation.navigateToDataVisualizer();
          await a11y.testAppSnapshot();
        });

        it('index data visualizer select index pattern page', async () => {
          await ml.dataVisualizer.navigateToDataViewSelection();
          await a11y.testAppSnapshot();
        });

        it('index data visualizer page for selected index', async () => {
          await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(ecIndexName);

          await ml.testExecution.logTestStep('should display the time range step');
          await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();

          await ml.testExecution.logTestStep('should load data for full time range');
          await ml.dataVisualizerIndexBased.clickUseFullDataButton(ecExpectedTotalCount);
          await a11y.testAppSnapshot();
        });

        it('file data visualizer select file page', async () => {
          await ml.navigation.navigateToDataVisualizer();
          await ml.dataVisualizer.navigateToFileUpload();
          await a11y.testAppSnapshot();
        });

        it('file data visualizer file details page', async () => {
          await ml.testExecution.logTestStep(
            'should select a file and load visualizer result page'
          );
          await ml.dataVisualizerFileBased.selectFile(uploadFilePath);
          await a11y.testAppSnapshot();
        });

        it('file data visualizer import data page', async () => {
          await ml.dataVisualizerFileBased.navigateToFileImport();
          await a11y.testAppSnapshot();
        });
      });
    });
  });
}
