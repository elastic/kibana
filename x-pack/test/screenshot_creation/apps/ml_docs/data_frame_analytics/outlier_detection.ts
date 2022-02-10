/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

import { LOGS_INDEX_PATTERN } from '../index';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');
  const transform = getService('transform');

  const screenshotDirectories = ['ml_docs', 'data_frame_analytics'];

  const transformConfig = {
    id: `logs-by-clientip`,
    source: { index: LOGS_INDEX_PATTERN },
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
      await mlScreenshots.takeScreenshot('logs-transform-preview', screenshotDirectories);
    });

    it('wizard screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to data frame analytics list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataFrameAnalytics();

      await ml.testExecution.logTestStep('open outlier detection job in wizard');
      await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
      await ml.dataFrameAnalyticsTable.filterWithSearchString(outlierJobConfig.id as string, 1);
      await ml.dataFrameAnalyticsTable.cloneJob(outlierJobConfig.id as string);
      await ml.dataFrameAnalyticsCreation.assertSourceDataPreviewExists();
      await ml.dataFrameAnalyticsCreation.assertIncludeFieldsSelectionExists();

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.takeScreenshot('weblog-outlier-job-1', screenshotDirectories);

      await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
      await ml.dataFrameAnalyticsCreation.assertScatterplotMatrixLoaded();
      await ml.dataFrameAnalyticsCreation.scrollScatterplotMatrixIntoView();
      await mlScreenshots.takeScreenshot('weblog-outlier-scatterplot', screenshotDirectories);
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
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('outliers', screenshotDirectories);

      await ml.testExecution.logTestStep('scroll to scatterplot matrix and take screenshot');
      await ml.dataFrameAnalyticsResults.expandScatterplotMatrixSection(true);
      await mlScreenshots.removeFocusFromElement();
      await ml.dataFrameAnalyticsResults.assertScatterplotMatrixLoaded();
      await ml.dataFrameAnalyticsResults.scrollScatterplotMatrixIntoView();
      await mlScreenshots.takeScreenshot('outliers-scatterplot', screenshotDirectories);
    });
  });
}
