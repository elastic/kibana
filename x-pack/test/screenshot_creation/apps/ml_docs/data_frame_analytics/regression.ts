/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataFrameAnalyticsConfig } from '@kbn/ml-plugin/public/application/data_frame_analytics/common';
import { DeepPartial } from '@kbn/ml-plugin/common/types/common';
import { FtrProviderContext } from '../../../ftr_provider_context';

import { FLIGHTS_INDEX_PATTERN } from '..';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');

  const screenshotDirectories = ['ml_docs', 'data_frame_analytics'];

  const regressionJobConfig: DeepPartial<DataFrameAnalyticsConfig> = {
    id: 'model-flight-delays-regression',
    source: {
      index: FLIGHTS_INDEX_PATTERN,
      query: { range: { DistanceKilometers: { gt: 0 } } },
    },
    dest: { index: 'model-flight-delays-regression', results_field: 'ml' },
    analysis: {
      regression: {
        dependent_variable: 'FlightDelayMin',
        training_percent: 10,
        num_top_feature_importance_values: 5,
      },
    },
    analyzed_fields: {
      includes: [],
      excludes: ['Cancelled', 'FlightDelay', 'FlightDelayType'],
    },
    model_memory_limit: '1gb',
  };

  describe('regression job', function () {
    before(async () => {
      await ml.api.createAndRunDFAJob(regressionJobConfig as DataFrameAnalyticsConfig);
      await ml.testResources.createIndexPatternIfNeeded(regressionJobConfig.dest!.index!);
    });

    after(async () => {
      await ml.api.deleteDataFrameAnalyticsJobES(regressionJobConfig.id as string);
      await ml.testResources.deleteIndexPatternByTitle(regressionJobConfig.dest!.index!);
      await ml.api.deleteIndices(regressionJobConfig.dest!.index!);
      await ml.api.cleanMlIndices();
    });

    it('wizard screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('start new regression job creation in wizard');
      await ml.dataFrameAnalytics.startAnalyticsCreation();
      await ml.jobSourceSelection.selectSourceForAnalyticsJob(FLIGHTS_INDEX_PATTERN);
      await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();

      await ml.testExecution.logTestStep('select job type and set options');
      await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
      await ml.dataFrameAnalyticsCreation.selectJobType('regression');
      await ml.dataFrameAnalyticsCreation.setQueryBarValue('DistanceKilometers > 0');
      await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
      await ml.dataFrameAnalyticsCreation.selectDependentVariable('FlightDelayMin');

      await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
      await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.removeFocusFromElement();
      await ml.dataFrameAnalyticsCreation.scrollJobTypeSelectionIntoView();
      await mlScreenshots.takeScreenshot('flights-regression-job-1', screenshotDirectories);

      await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
      await ml.dataFrameAnalyticsCreation.assertScatterplotMatrixLoaded();
      await ml.dataFrameAnalyticsCreation.scrollScatterplotMatrixIntoView();
      await mlScreenshots.takeScreenshot(
        'flightdata-regression-scatterplot',
        screenshotDirectories
      );
    });

    it('list row screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('open job row details');
      await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
      await ml.dataFrameAnalyticsTable.ensureDetailsOpen(regressionJobConfig.id as string);
      await ml.dataFrameAnalyticsTable.ensureDetailsTabOpen(
        regressionJobConfig.id as string,
        'job-details'
      );

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('flights-regression-details', screenshotDirectories);
    });

    it('results view screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('open job results view');
      await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
      await ml.dataFrameAnalyticsTable.filterWithSearchString(regressionJobConfig.id as string, 1);
      await ml.dataFrameAnalyticsTable.openResultsView(regressionJobConfig.id as string);
      await ml.dataFrameAnalyticsResults.assertRegressionEvaluatePanelElementsExists();
      await ml.dataFrameAnalyticsResults.assertRegressionTablePanelExists();
      await ml.dataFrameAnalyticsResults.assertResultsTableExists();
      await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();

      await ml.testExecution.logTestStep('fold sections and take screenshot');
      await ml.dataFrameAnalyticsResults.expandAnalysisSection(false);
      await ml.dataFrameAnalyticsResults.expandRegressionEvaluationSection(false);
      await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(false);
      await ml.dataFrameAnalyticsResults.expandScatterplotMatrixSection(false);
      await ml.dataFrameAnalyticsResults.scrollAnalysisIntoView();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('flights-regression-results', screenshotDirectories);

      await ml.testExecution.logTestStep('expand feature importance section and take screenshot');
      await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(true);
      await ml.dataFrameAnalyticsResults.scrollFeatureImportanceIntoView();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot(
        'flights-regression-total-importance',
        screenshotDirectories
      );
      await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(false);

      await ml.testExecution.logTestStep('expand evaluation section and take screenshot');
      await ml.dataFrameAnalyticsResults.expandRegressionEvaluationSection(true);
      await ml.dataFrameAnalyticsResults.scrollRegressionEvaluationIntoView();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('flights-regression-evaluation', screenshotDirectories);
      await ml.dataFrameAnalyticsResults.expandRegressionEvaluationSection(false);

      await ml.testExecution.logTestStep('open decision path popover and take screenshot');
      await ml.dataFrameAnalyticsResults.scrollResultsIntoView();
      await ml.dataFrameAnalyticsResults.openFeatureImportancePopover();
      await mlScreenshots.takeScreenshot('flights-regression-importance', screenshotDirectories);
    });
  });
}
