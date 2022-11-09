/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const a11y = getService('a11y');
  const ml = getService('ml');

  describe('ml Accessibility', () => {
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

        it('anomaly detection page', async () => {
          await ml.navigation.navigateToAnomalyDetection();
          await a11y.testAppSnapshot();
        });

        it('data frame analytics page', async () => {
          await ml.navigation.navigateToDataFrameAnalytics();
          await a11y.testAppSnapshot();
        });

        it('settings page', async () => {
          await ml.navigation.navigateToSettings();
          await a11y.testAppSnapshot();
        });
      });

      describe('with data loaded', function () {
        const adJobId = 'fq_single_a11y';
        const dfaOutlierResultsJobId = 'iph_outlier_a11y';
        const calendarId = 'calendar_a11y';
        const eventDescription = 'calendar_event_a11y';
        const filterId = 'filter_a11y';
        const filterItems = ['filter_item_a11y'];
        const fqIndexPattern = 'ft_farequote';
        const ecIndexPattern = 'ft_module_sample_ecommerce';
        const ihpIndexPattern = 'ft_ihp_outlier';
        const egsIndexPattern = 'ft_egs_regression';
        const bmIndexPattern = 'ft_bank_marketing';
        const ecExpectedTotalCount = '287';

        const adJobAggAndFieldIdentifier = 'Mean(responsetime)';
        const adJobBucketSpan = '30m';
        const adSingleMetricJobId = `fq_single_a11y_${Date.now()}`;
        const adMultiSplitField = 'airline';
        const adMultiMetricJobId = `fq_multi_a11y_${Date.now()}`;
        const adMultiMetricJobDescription =
          'Multi metric job based on the farequote dataset with 30m bucketspan and mean(responsetime) split by airline';

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
          '../../functional/apps/ml/data_visualizer/files_to_import/artificial_server_log'
        );

        before(async () => {
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/egs_regression');
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
          await esArchiver.loadIfNeeded(
            'x-pack/test/functional/es_archives/ml/module_sample_ecommerce'
          );
          await ml.testResources.createIndexPatternIfNeeded(fqIndexPattern, '@timestamp');
          await ml.testResources.createIndexPatternIfNeeded(ihpIndexPattern);
          await ml.testResources.createIndexPatternIfNeeded(egsIndexPattern);
          await ml.testResources.createIndexPatternIfNeeded(bmIndexPattern);
          await ml.testResources.createIndexPatternIfNeeded(ecIndexPattern, 'order_date');
          await ml.testResources.setKibanaTimeZoneToUTC();

          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            ml.commonConfig.getADFqMultiMetricJobConfig(adJobId),
            ml.commonConfig.getADFqDatafeedConfig(adJobId)
          );

          await ml.api.createAndRunDFAJob(
            ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaOutlierResultsJobId)
          );

          await ml.api.createCalendar(calendarId, {
            calendar_id: calendarId,
            job_ids: [],
            description: 'Test calendar',
          });
          await ml.api.createCalendarEvents(calendarId, [
            {
              description: eventDescription,
              start_time: '1513641600000',
              end_time: '1513728000000',
            },
          ]);

          await ml.api.createFilter(filterId, {
            description: 'Test filter list',
            items: filterItems,
          });
        });

        after(async () => {
          await ml.api.cleanMlIndices();
          await ml.api.deleteIndices(`user-${dfaOutlierResultsJobId}`);
          await ml.api.deleteCalendar(calendarId);
          await ml.api.deleteFilter(filterId);

          await ml.testResources.deleteIndexPatternByTitle(fqIndexPattern);
          await ml.testResources.deleteIndexPatternByTitle(ihpIndexPattern);
          await ml.testResources.deleteIndexPatternByTitle(egsIndexPattern);
          await ml.testResources.deleteIndexPatternByTitle(bmIndexPattern);
          await ml.testResources.deleteIndexPatternByTitle(ecIndexPattern);
          await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
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

        it('anomaly detection jobs list page', async () => {
          await ml.navigation.navigateToAnomalyDetection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create job select index pattern page', async () => {
          await ml.jobManagement.navigateToNewJobSourceSelection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create job select type page', async () => {
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(fqIndexPattern);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job time range step', async () => {
          await ml.jobTypeSelection.selectSingleMetricJob();
          await ml.testExecution.logTestStep('job creation set the time range');
          await ml.jobWizardCommon.clickUseFullDataButton(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 23:59:54.000'
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.testExecution.logTestStep('job creation selects field and aggregation');
          await ml.jobWizardCommon.selectAggAndField(adJobAggAndFieldIdentifier, true);
          await ml.testExecution.logTestStep('job creation inputs the bucket span');
          await ml.jobWizardCommon.setBucketSpan(adJobBucketSpan);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.testExecution.logTestStep('job creation inputs the job id');
          await ml.jobWizardCommon.setJobId(adSingleMetricJobId);
          await ml.testExecution.logTestStep('job creation opens the additional settings section');
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.testExecution.logTestStep('job creation opens the advanced section');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create single metric job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job and move to time range step', async () => {
          // Proceed all the way to the step for selecting the time range
          // as the other steps have already been tested for the single metric job
          await ml.navigation.navigateToAnomalyDetection();
          await ml.jobManagement.navigateToNewJobSourceSelection();
          await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(fqIndexPattern);
          await ml.jobTypeSelection.selectMultiMetricJob();
          await ml.testExecution.logTestStep('job creation set the time range');
          await ml.jobWizardCommon.clickUseFullDataButton(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 23:59:54.000'
          );
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job pick fields step', async () => {
          await ml.jobWizardCommon.advanceToPickFieldsSection();
          await ml.testExecution.logTestStep('job creation selects field and aggregation');
          await ml.jobWizardCommon.selectAggAndField(adJobAggAndFieldIdentifier, false);
          await ml.testExecution.logTestStep('job creation selects split field');
          await ml.jobWizardMultiMetric.selectSplitField(adMultiSplitField);
          await ml.testExecution.logTestStep('job creation inputs the bucket span');
          await ml.jobWizardCommon.setBucketSpan(adJobBucketSpan);
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job details step', async () => {
          await ml.jobWizardCommon.advanceToJobDetailsSection();
          await ml.testExecution.logTestStep('job creation inputs the job id');
          await ml.jobWizardCommon.setJobId(adMultiMetricJobId);
          await ml.testExecution.logTestStep('job creation inputs the job description');
          await ml.jobWizardCommon.setJobDescription(adMultiMetricJobDescription);
          await ml.testExecution.logTestStep('job creation opens the additional settings section');
          await ml.jobWizardCommon.ensureAdditionalSettingsSectionOpen();
          await ml.testExecution.logTestStep('job creation opens the advanced section');
          await ml.jobWizardCommon.ensureAdvancedSectionOpen();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job validation step', async () => {
          await ml.jobWizardCommon.advanceToValidationSection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection create multi metric job summary step', async () => {
          await ml.jobWizardCommon.advanceToSummarySection();
          await a11y.testAppSnapshot();
        });

        it('anomaly detection Single Metric Viewer page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToAnomalyDetection();
          await ml.jobTable.clickOpenJobInSingleMetricViewerButton(adJobId);
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

          await ml.testExecution.logTestStep('should input the airline entity value');
          await ml.singleMetricViewer.assertEntityInputExist('airline');
          await ml.singleMetricViewer.assertEntityInputSelection('airline', []);
          await ml.singleMetricViewer.selectEntityValue('airline', 'AAL');

          await a11y.testAppSnapshot();
        });

        it('anomaly detection forecasting from Single Metric Viewer page', async () => {
          await ml.testExecution.logTestStep('opens the forecasting modal showing no forecasts');
          await ml.forecast.openForecastModal();
          await a11y.testAppSnapshot();

          await ml.testExecution.logTestStep('run the forecast and close the modal');
          await ml.forecast.clickForecastModalRunButton();

          await ml.testExecution.logTestStep('opens the forecasting modal showing a forecast');
          await ml.forecast.openForecastModal();
          await a11y.testAppSnapshot();

          await ml.testExecution.logTestStep('closes the forecasting modal');
          await ml.forecast.closeForecastModal();
        });

        it('anomaly detection Anomaly Explorer page', async () => {
          await ml.singleMetricViewer.openAnomalyExplorer();
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
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
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(ihpIndexPattern);
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
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(egsIndexPattern);
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
          await ml.jobSourceSelection.selectSourceForAnalyticsJob(bmIndexPattern);
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

        it('settings page', async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToSettings();
          await a11y.testAppSnapshot();
        });

        it('calendar management page', async () => {
          await ml.settings.navigateToCalendarManagement();
          await a11y.testAppSnapshot();
        });

        it('edit calendar page', async () => {
          await ml.settingsCalendar.openCalendarEditForm(calendarId);
          await a11y.testAppSnapshot();
        });

        it('filter list management page', async () => {
          await ml.navigation.navigateToSettings();
          await ml.settings.navigateToFilterListsManagement();
          await a11y.testAppSnapshot();
        });

        it('edit filter list page', async () => {
          await ml.settingsFilterList.openFilterListEditForm(filterId);
          await a11y.testAppSnapshot();
        });

        it('data visualizer selector page', async () => {
          await ml.navigation.navigateToDataVisualizer();
          await a11y.testAppSnapshot();
        });

        it('index data visualizer select index pattern page', async () => {
          await ml.dataVisualizer.navigateToIndexPatternSelection();
          await a11y.testAppSnapshot();
        });

        it('index data visualizer page for selected index', async () => {
          await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(ecIndexPattern);

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
