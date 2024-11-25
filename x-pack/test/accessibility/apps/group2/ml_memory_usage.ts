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

  const jobId = 'sample_job';

  describe('machine learning memory usage page Accessibility', function () {
    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
      await ml.securityUI.loginAsMlPowerUser();

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobId);
      await ml.api.createAnomalyDetectionJob(jobConfig);
      await ml.api.openAnomalyDetectionJob(jobId);

      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToMemoryUsage();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await ml.api.closeAnomalyDetectionJob(jobId);
      await ml.api.cleanMlIndices();
    });

    it('memory usage - nodes tab - page', async () => {
      await a11y.testAppSnapshot();
    });

    it('memory usage - nodes tab - node details and node memory usage', async () => {
      await ml.memoryUsage.expandRow();
      await a11y.testAppSnapshot();

      await ml.memoryUsage.selectNodeExpandedRowTab('mlNodesOverviewPanelMemoryTab');
      await a11y.testAppSnapshot();
    });

    it('memory usage - memory usage tab - page', async () => {
      await ml.memoryUsage.selectTab('memory-usage');
      await a11y.testAppSnapshot();
    });
  });
}
