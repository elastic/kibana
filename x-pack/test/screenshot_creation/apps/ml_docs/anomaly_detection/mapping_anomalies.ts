/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';

import { LOGS_INDEX_PATTERN } from '..';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const header = getPageObject('header');
  const maps = getPageObject('maps');
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');
  const renderable = getService('renderable');

  const screenshotDirectories = ['ml_docs', 'anomaly_detection'];

  const weblogVectorJobConfig = {
    job_id: `weblogs-vectors`,
    analysis_config: {
      bucket_span: '15m',
      influencers: ['geo.src', 'agent.keyword', 'geo.dest'],
      detectors: [
        {
          detector_description: 'Sum of bytes',
          function: 'sum',
          field_name: 'bytes',
          partition_field_name: 'geo.dest',
        },
      ],
    },
    data_description: { time_field: 'timestamp', time_format: 'epoch_ms' },
    custom_settings: { created_by: 'multi-metric-wizard' },
  };

  const weblogVectorDatafeedConfig = {
    datafeed_id: 'datafeed-weblogs-vectors',
    indices: [LOGS_INDEX_PATTERN],
    job_id: 'weblogs-vectors',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  describe('mapping anomalies', function () {
    before(async () => {
      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        weblogVectorJobConfig as Job,
        weblogVectorDatafeedConfig as Datafeed
      );
    });

    after(async () => {
      await ml.api.deleteAnomalyDetectionJobES(weblogVectorJobConfig.job_id);
      await ml.api.cleanMlIndices();
    });

    it('data visualizer screenshot', async () => {
      await ml.testExecution.logTestStep('open index in data visualizer');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataVisualizer();
      await ml.dataVisualizer.navigateToIndexPatternSelection();
      await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(LOGS_INDEX_PATTERN);

      await ml.testExecution.logTestStep('set data visualizer options');
      await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();
      await ml.dataVisualizerIndexBased.clickUseFullDataButton('14,074');
      await ml.dataVisualizerTable.setSampleSizeInputValue(
        'all',
        'geo.coordinates',
        '14074 (100%)'
      );
      await ml.dataVisualizerTable.setFieldNameFilter(['geo.dest']);

      await ml.testExecution.logTestStep('set maps options and take screenshot');
      await ml.dataVisualizerTable.ensureDetailsOpen('geo.dest');
      await renderable.waitForRender();
      await maps.openLegend();

      await mlScreenshots.takeScreenshot(
        'weblogs-data-visualizer-choropleth',
        screenshotDirectories
      );
    });

    it('wizard screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('load job in the multi-metric wizard');
      await ml.navigation.navigateToJobManagement();
      await ml.jobTable.filterWithSearchString(weblogVectorJobConfig.job_id, 1);
      await ml.jobTable.clickCloneJobAction(weblogVectorJobConfig.job_id);
      await ml.jobTypeSelection.assertMultiMetricJobWizardOpen();

      await ml.testExecution.logTestStep('navigate to pick fields step');
      await ml.jobWizardCommon.advanceToPickFieldsSection();
      await header.awaitGlobalLoadingIndicatorHidden();
      await ml.jobWizardMultiMetric.scrollSplitFieldIntoView();

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.takeScreenshot(
        'weblogs-multimetric-wizard-vector',
        screenshotDirectories
      );
    });

    it('anomaly explorer screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('open job in anomaly explorer');
      await ml.jobTable.filterWithSearchString(weblogVectorJobConfig.job_id, 1);
      await ml.jobTable.clickOpenJobInAnomalyExplorerButton(weblogVectorJobConfig.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('scroll map into view and take screenshot');
      await ml.anomalyExplorer.scrollMapContainerIntoView();
      await renderable.waitForRender();
      await maps.openLegend();
      await mlScreenshots.takeScreenshot('weblogs-anomaly-explorer-vectors', screenshotDirectories);
    });
  });
}
