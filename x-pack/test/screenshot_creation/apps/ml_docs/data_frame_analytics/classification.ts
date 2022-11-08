/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

import { FLIGHTS_INDEX_PATTERN } from '../index';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');

  const screenshotDirectories = ['ml_docs', 'data_frame_analytics'];

  const classificationJobConfig: DeepPartial<DataFrameAnalyticsConfig> = {
    id: 'model-flight-delays-classification',
    source: {
      index: FLIGHTS_INDEX_PATTERN,
    },
    dest: { index: 'model-flight-delays-classification', results_field: 'ml' },
    analysis: {
      classification: {
        dependent_variable: 'FlightDelay',
        training_percent: 10,
        num_top_feature_importance_values: 10,
      },
    },
    analyzed_fields: {
      includes: [],
      excludes: ['Cancelled', 'FlightDelayMin', 'FlightDelayType'],
    },
    model_memory_limit: '1gb',
  };

  describe('classification job', function () {
    before(async () => {
      await ml.api.createAndRunDFAJob(classificationJobConfig as DataFrameAnalyticsConfig);
      await ml.testResources.createIndexPatternIfNeeded(classificationJobConfig.dest!.index!);
    });

    after(async () => {
      await ml.api.deleteDataFrameAnalyticsJobES(classificationJobConfig.id as string);
      await ml.testResources.deleteIndexPatternByTitle(classificationJobConfig.dest!.index!);
      await ml.api.deleteIndices(classificationJobConfig.dest!.index!);
      await ml.api.cleanMlIndices();
    });

    it('wizard screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('start new classification job creation in wizard');
      await ml.dataFrameAnalytics.startAnalyticsCreation();
      await ml.jobSourceSelection.selectSourceForAnalyticsJob(FLIGHTS_INDEX_PATTERN);
      await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();

      await ml.testExecution.logTestStep('select job type and set options');
      await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
      await ml.dataFrameAnalyticsCreation.selectJobType('classification');
      await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
      await ml.dataFrameAnalyticsCreation.selectDependentVariable('FlightDelay');

      await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
      await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.removeFocusFromElement();
      await ml.dataFrameAnalyticsCreation.scrollJobTypeSelectionIntoView();
      await mlScreenshots.takeScreenshot('flights-classification-job-1', screenshotDirectories);

      await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
      await ml.dataFrameAnalyticsCreation.assertScatterplotMatrixLoaded();
      await ml.dataFrameAnalyticsCreation.scrollScatterplotMatrixIntoView();
      await mlScreenshots.takeScreenshot(
        'flights-classification-scatterplot',
        screenshotDirectories
      );
    });

    it('list row screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('open job row details');
      await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
      await ml.dataFrameAnalyticsTable.ensureDetailsOpen(classificationJobConfig.id as string);
      await ml.dataFrameAnalyticsTable.ensureDetailsTabOpen(
        classificationJobConfig.id as string,
        'job-details'
      );

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('flights-classification-details', screenshotDirectories);
    });

    it('results view screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('open job results view');
      await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
      await ml.dataFrameAnalyticsTable.filterWithSearchString(
        classificationJobConfig.id as string,
        1
      );
      await ml.dataFrameAnalyticsTable.openResultsView(classificationJobConfig.id as string);
      await ml.dataFrameAnalyticsResults.assertClassificationEvaluatePanelElementsExists();
      await ml.dataFrameAnalyticsResults.assertClassificationTablePanelExists();
      await ml.dataFrameAnalyticsResults.assertResultsTableExists();
      await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();

      await ml.testExecution.logTestStep('fold sections and take screenshot');
      await ml.dataFrameAnalyticsResults.expandAnalysisSection(false);
      await ml.dataFrameAnalyticsResults.expandClassificationEvaluationSection(false);
      await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(false);
      await ml.dataFrameAnalyticsResults.expandScatterplotMatrixSection(false);
      await ml.dataFrameAnalyticsResults.scrollAnalysisIntoView();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('flights-classification-results', screenshotDirectories);

      await ml.testExecution.logTestStep('expand feature importance section and take screenshot');
      await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(true);
      await ml.dataFrameAnalyticsResults.scrollFeatureImportanceIntoView();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot(
        'flights-classification-total-importance',
        screenshotDirectories
      );
      await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(false);

      await ml.testExecution.logTestStep('expand evaluation section and take screenshot');
      await ml.dataFrameAnalyticsResults.expandClassificationEvaluationSection(true);
      await ml.dataFrameAnalyticsResults.scrollClassificationEvaluationIntoView();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot(
        'flights-classification-evaluation',
        screenshotDirectories
      );
      await mlScreenshots.takeScreenshot('confusion-matrix-binary', screenshotDirectories);
      await mlScreenshots.takeScreenshot('confusion-matrix-binary-accuracy', screenshotDirectories);
      await ml.dataFrameAnalyticsResults.scrollRocCurveChartIntoView();
      await mlScreenshots.takeScreenshot('flights-classification-roc-curve', screenshotDirectories);
      await ml.dataFrameAnalyticsResults.expandClassificationEvaluationSection(false);

      await ml.testExecution.logTestStep('open decision path popover and take screenshot');
      await ml.dataFrameAnalyticsResults.scrollResultsIntoView();
      await ml.dataFrameAnalyticsResults.openFeatureImportancePopover();
      await mlScreenshots.takeScreenshot(
        'flights-classification-importance',
        screenshotDirectories
      );
    });
  });
}
