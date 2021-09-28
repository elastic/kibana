/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

import { FLIGHTS_INDEX_PATTERN } from './index';
import { DataFrameAnalyticsConfig } from '../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../plugins/ml/common/types/common';

export default function ({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const ml = getService('ml');
  const screenshot = getService('screenshots');
  const transform = getService('transform');

  async function takeScreenshot(name: string) {
    await screenshot.take(`${name}_new`, undefined, ['ml_docs', 'data_frame_analytics']);
  }

  async function removeFocusFromElement() {
    // open and close the Kibana nav to un-focus the last used element
    await ml.navigation.openKibanaNav();
    await ml.navigation.closeKibanaNav();
  }

  const transformConfig = {
    id: `logs-by-clientip`,
    source: { index: 'kibana_sample_data_logs' },
    pivot: {
      group_by: { clientip: { terms: { field: 'clientip' } } },
      aggregations: {
        '@timestamp.value_count': { value_count: { field: '@timestamp' } },
        'bytes.max': { max: { field: 'bytes' } },
        'bytes.sum': { sum: { field: 'bytes' } },
        'request.value_count': { value_count: { field: 'request.keyword' } },
      },
    },
    description: 'Web logs by client IP',
    dest: { index: 'weblog-clientip' },
  };

  const outlierJobConfig: DeepPartial<DataFrameAnalyticsConfig> = {
    id: 'weblog-outliers',
    source: { index: 'weblog-clientip' },
    dest: { index: 'weblog-outliers', results_field: 'ml' },
    analysis: { outlier_detection: {} },
    analyzed_fields: {
      includes: ['@timestamp.value_count', 'bytes.max', 'bytes.sum', 'request.value_count'],
      excludes: [],
    },
    model_memory_limit: '20mb',
  };

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

  describe('data frame analytics', function () {
    this.tags(['mlqa']);

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await browser.setWindowSize(1920, 1080);
    });

    describe('outlier detection job', function () {
      before(async () => {
        await transform.api.createAndRunTransform(transformConfig.id, transformConfig);
        await ml.testResources.createIndexPatternIfNeeded(transformConfig.dest.index);

        await ml.api.createAndRunDFAJob(outlierJobConfig as DataFrameAnalyticsConfig);
        await ml.testResources.createIndexPatternIfNeeded(outlierJobConfig.dest!.index!);
      });

      after(async () => {
        await ml.testResources.deleteIndexPatternByTitle(transformConfig.dest.index);
        await transform.api.deleteIndices(transformConfig.dest.index);
        await transform.api.cleanTransformIndices();

        await ml.api.deleteDataFrameAnalyticsJobES(outlierJobConfig.id as string);
        await ml.testResources.deleteIndexPatternByTitle(outlierJobConfig.dest!.index!);
        await ml.api.deleteIndices(outlierJobConfig.dest!.index!);
        await ml.api.cleanMlIndices();
      });

      it('transform screenshot', async () => {
        await ml.testExecution.logTestStep('navigate to transform list');
        await transform.navigation.navigateTo();

        await transform.testExecution.logTestStep('open transform in wizard');
        await transform.management.assertTransformListPageExists();
        await transform.table.refreshTransformList();
        await transform.table.filterWithSearchString(transformConfig.id, 1);
        await transform.table.assertTransformRowActions(transformConfig.id, false);
        await transform.table.clickTransformRowAction(transformConfig.id, 'Clone');
        await transform.wizard.assertDefineStepActive();

        await ml.testExecution.logTestStep('take screenshot');
        await takeScreenshot('logs-transform-preview');
      });

      it('wizard screenshots', async () => {
        await ml.testExecution.logTestStep('navigate to data frame analytics list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataFrameAnalytics();

        await transform.testExecution.logTestStep('open outlier detection job in wizard');
        await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
        await ml.dataFrameAnalyticsTable.filterWithSearchString(outlierJobConfig.id as string, 1);
        await ml.dataFrameAnalyticsTable.cloneJob(outlierJobConfig.id as string);
        await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
        await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

        await ml.testExecution.logTestStep('take screenshot');
        await takeScreenshot('weblog-outlier-job-1');

        await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
        await ml.dataFrameAnalyticsCreation.assertScatterplotMatrixLoaded();
        await ml.dataFrameAnalyticsCreation.scrollScatterplotMatrixIntoView();
        await takeScreenshot('weblog-outlier-scatterplot');
      });

      it('results view screenshots', async () => {
        await ml.testExecution.logTestStep('navigate to data frame analytics list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataFrameAnalytics();

        await ml.testExecution.logTestStep('open job results view');
        await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
        await ml.dataFrameAnalyticsTable.filterWithSearchString(outlierJobConfig.id as string, 1);
        await ml.dataFrameAnalyticsTable.openResultsView(outlierJobConfig.id as string);
        await ml.dataFrameAnalyticsResults.assertOutlierTablePanelExists();
        await ml.dataFrameAnalyticsResults.assertResultsTableExists();
        await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();

        await ml.testExecution.logTestStep('fold scatterplot section and take screenshot');
        await ml.dataFrameAnalyticsResults.expandScatterplotMatrixSection(false);
        await removeFocusFromElement();
        await takeScreenshot('outliers');

        await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
        await ml.dataFrameAnalyticsResults.expandScatterplotMatrixSection(true);
        await removeFocusFromElement();
        await ml.dataFrameAnalyticsResults.assertScatterplotMatrixLoaded();
        await ml.dataFrameAnalyticsResults.scrollScatterplotMatrixIntoView();
        await takeScreenshot('outliers-scatterplot');
      });
    });

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

        await transform.testExecution.logTestStep('start new regression job creation in wizard');
        await ml.dataFrameAnalytics.startAnalyticsCreation();
        await ml.jobSourceSelection.selectSourceForAnalyticsJob(FLIGHTS_INDEX_PATTERN);
        await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();

        await transform.testExecution.logTestStep('select job type and set options');
        await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
        await ml.dataFrameAnalyticsCreation.selectJobType('regression');
        await ml.dataFrameAnalyticsCreation.setQueryBarValue('DistanceKilometers > 0');
        await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
        await ml.dataFrameAnalyticsCreation.selectDependentVariable('FlightDelayMin');

        await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
        await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

        await ml.testExecution.logTestStep('take screenshot');
        await removeFocusFromElement();
        await ml.dataFrameAnalyticsCreation.scrollJobTypeSelectionIntoView();
        await takeScreenshot('flights-regression-job-1');

        await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
        await ml.dataFrameAnalyticsCreation.assertScatterplotMatrixLoaded();
        await ml.dataFrameAnalyticsCreation.scrollScatterplotMatrixIntoView();
        await takeScreenshot('flightdata-regression-scatterplot');
      });

      it('list row screenshot', async () => {
        await ml.testExecution.logTestStep('navigate to data frame analytics list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataFrameAnalytics();

        await transform.testExecution.logTestStep('open job row details');
        await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
        await ml.dataFrameAnalyticsTable.ensureDetailsOpen(regressionJobConfig.id as string);
        await ml.dataFrameAnalyticsTable.ensureDetailsTabOpen(
          regressionJobConfig.id as string,
          'job-details'
        );

        await ml.testExecution.logTestStep('take screenshot');
        await removeFocusFromElement();
        await takeScreenshot('flights-regression-details');
      });

      it('results view screenshots', async () => {
        await ml.testExecution.logTestStep('navigate to data frame analytics list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataFrameAnalytics();

        await ml.testExecution.logTestStep('open job results view');
        await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
        await ml.dataFrameAnalyticsTable.filterWithSearchString(
          regressionJobConfig.id as string,
          1
        );
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
        await removeFocusFromElement();
        await takeScreenshot('flights-regression-results');

        await ml.testExecution.logTestStep('expand feature importance section and take screenshot');
        await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(true);
        await ml.dataFrameAnalyticsResults.scrollFeatureImportanceIntoView();
        await removeFocusFromElement();
        await takeScreenshot('flights-regression-total-importance');
        await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(false);

        await ml.testExecution.logTestStep('expand evaluation section and take screenshot');
        await ml.dataFrameAnalyticsResults.expandRegressionEvaluationSection(true);
        await ml.dataFrameAnalyticsResults.scrollRegressionEvaluationIntoView();
        await removeFocusFromElement();
        await takeScreenshot('flights-regression-evaluation');
        await ml.dataFrameAnalyticsResults.expandRegressionEvaluationSection(false);

        await ml.testExecution.logTestStep('open decision path popover and take screenshot');
        await ml.dataFrameAnalyticsResults.scrollResultsIntoView();
        await ml.dataFrameAnalyticsResults.openFeatureImportancePopover();
        await takeScreenshot('flights-regression-importance');
      });
    });

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

        await transform.testExecution.logTestStep(
          'start new classification job creation in wizard'
        );
        await ml.dataFrameAnalytics.startAnalyticsCreation();
        await ml.jobSourceSelection.selectSourceForAnalyticsJob(FLIGHTS_INDEX_PATTERN);
        await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();

        await transform.testExecution.logTestStep('select job type and set options');
        await ml.dataFrameAnalyticsCreation.assertJobTypeSelectExists();
        await ml.dataFrameAnalyticsCreation.selectJobType('classification');
        await ml.dataFrameAnalyticsCreation.assertDependentVariableInputExists();
        await ml.dataFrameAnalyticsCreation.selectDependentVariable('FlightDelay');

        await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
        await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

        await ml.testExecution.logTestStep('take screenshot');
        await removeFocusFromElement();
        await ml.dataFrameAnalyticsCreation.scrollJobTypeSelectionIntoView();
        await takeScreenshot('flights-classification-job-1');

        await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
        await ml.dataFrameAnalyticsCreation.assertScatterplotMatrixLoaded();
        await ml.dataFrameAnalyticsCreation.scrollScatterplotMatrixIntoView();
        await takeScreenshot('flights-classification-scatterplot');
      });

      it('list row screenshot', async () => {
        await ml.testExecution.logTestStep('navigate to data frame analytics list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToDataFrameAnalytics();

        await transform.testExecution.logTestStep('open job row details');
        await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
        await ml.dataFrameAnalyticsTable.ensureDetailsOpen(classificationJobConfig.id as string);
        await ml.dataFrameAnalyticsTable.ensureDetailsTabOpen(
          classificationJobConfig.id as string,
          'job-details'
        );

        await ml.testExecution.logTestStep('take screenshot');
        await removeFocusFromElement();
        await takeScreenshot('flights-classification-details');
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
        await removeFocusFromElement();
        await takeScreenshot('flights-classification-results');

        await ml.testExecution.logTestStep('expand feature importance section and take screenshot');
        await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(true);
        await ml.dataFrameAnalyticsResults.scrollFeatureImportanceIntoView();
        await removeFocusFromElement();
        await takeScreenshot('flights-classification-total-importance');
        await ml.dataFrameAnalyticsResults.expandFeatureImportanceSection(false);

        await ml.testExecution.logTestStep('expand evaluation section and take screenshot');
        await ml.dataFrameAnalyticsResults.expandClassificationEvaluationSection(true);
        await ml.dataFrameAnalyticsResults.scrollClassificationEvaluationIntoView();
        await removeFocusFromElement();
        await takeScreenshot('flights-classification-evaluation');
        await takeScreenshot('confusion-matrix-binary');
        await takeScreenshot('confusion-matrix-binary-accuracy');
        await ml.dataFrameAnalyticsResults.scrollRocCurveChartIntoView();
        await takeScreenshot('flights-classification-roc-curve');
        await ml.dataFrameAnalyticsResults.expandClassificationEvaluationSection(false);

        await ml.testExecution.logTestStep('open decision path popover and take screenshot');
        await ml.dataFrameAnalyticsResults.scrollResultsIntoView();
        await ml.dataFrameAnalyticsResults.openFeatureImportancePopover();
        await takeScreenshot('flights-classification-importance');
      });
    });
  });
}
