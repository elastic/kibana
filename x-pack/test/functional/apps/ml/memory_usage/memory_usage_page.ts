/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');

  const jobId = 'sample_job';

  describe('ML memory usage page', function () {
    this.tags(['ml']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobId);

      // Create and open AD job
      await ml.api.createAnomalyDetectionJob(jobConfig);
      await ml.api.openAnomalyDetectionJob(jobId);

      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToMemoryUsage();
    });

    after(async () => {
      await ml.api.closeAnomalyDetectionJob(jobId);
      await ml.api.cleanMlIndices();
    });

    it('opens page with nodes tab selected', async () => {
      await ml.memoryUsage.assertMemoryUsageTabIsSelected('nodes');
    });

    it('allows sorting', async () => {
      await ml.memoryUsage.sortColumn('tableHeaderCell_name_1');
      await ml.memoryUsage.assertColumnIsSorted('tableHeaderCell_name_1', 'descending');
    });

    it('allows searching for a node', async () => {
      await ml.memoryUsage.searchForNode('ftr');
      await ml.memoryUsage.assertRowCount(1);
    });

    it('expands node details and displays memory usage details', async () => {
      await ml.memoryUsage.expandRow();
      await ml.memoryUsage.assertNodeExpandedDetailsPanelsExist();
      await ml.memoryUsage.selectNodeExpandedRowTab('mlNodesOverviewPanelMemoryTab');
      await ml.memoryUsage.assertChartItemsSelectedByDefault();
      await ml.memoryUsage.assertTreeChartExists();
    });

    it('clears selected chart items', async () => {
      await ml.memoryUsage.clearSelectedChartItems();
      await ml.memoryUsage.assertEmptyTreeChartExists();
    });

    it('selects memory usage tab and displays chart', async () => {
      await ml.memoryUsage.selectTab('memory-usage');
      await ml.memoryUsage.assertTreeChartExists();

      await ml.memoryUsage.clearSelectedChartItems();
      await ml.memoryUsage.assertEmptyTreeChartExists();
    });
  });
}
