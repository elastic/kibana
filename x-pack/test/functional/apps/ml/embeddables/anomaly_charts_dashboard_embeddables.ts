/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { JOB_CONFIG, DATAFEED_CONFIG, ML_EMBEDDABLE_TYPES } from './constants';

const testDataList = [
  {
    type: 'testData',
    suiteSuffix: 'with multi metric job',
    panelTitle: `ML anomaly charts for ${JOB_CONFIG.job_id}`,
    jobConfig: JOB_CONFIG,
    datafeedConfig: DATAFEED_CONFIG,
    dashboardTitle: `ML anomaly charts for fq_multi_1_ae ${Date.now()}`,
    expected: {
      influencers: [
        {
          field: 'airline',
          count: 10,
          labelsContained: ['AAL'],
        },
      ],
    },
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);

  describe('anomaly charts in dashboard', function () {
    this.tags(['mlqa']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    for (const testData of testDataList) {
      describe(testData.suiteSuffix, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
          await PageObjects.common.navigateToApp('dashboard');
        });

        after(async () => {
          await ml.testResources.deleteDashboardByTitle(testData.dashboardTitle);
        });

        it('can open job selection flyout', async () => {
          await PageObjects.dashboard.clickNewDashboard();
          await ml.dashboardEmbeddables.assertDashboardIsEmpty();
          await ml.dashboardEmbeddables.openAnomalyJobSelectionFlyout(
            ML_EMBEDDABLE_TYPES.ANOMALY_CHARTS
          );
        });

        it('can select jobs', async () => {
          await ml.dashboardJobSelectionTable.setRowCheckboxState(testData.jobConfig.job_id, true);
          await ml.dashboardJobSelectionTable.applyJobSelection();
          await ml.dashboardEmbeddables.assertAnomalyChartsEmbeddableInitializerExists();
          await ml.dashboardEmbeddables.assertSelectMaxSeriesToPlotValue(6);
        });

        it('create new anomaly charts panel', async () => {
          await ml.dashboardEmbeddables.clickInitializerConfirmButtonEnabled();
          await ml.dashboardEmbeddables.assertDashboardPanelExists(testData.panelTitle);

          await ml.dashboardEmbeddables.assertNoMatchingAnomaliesMessageExists();

          await PageObjects.timePicker.setAbsoluteRange(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 00:00:00.000'
          );
          await PageObjects.timePicker.pauseAutoRefresh();
          await ml.dashboardEmbeddables.assertAnomalyChartsSeverityThresholdControlExists();
          await ml.dashboardEmbeddables.assertAnomalyChartsExists();
          await PageObjects.dashboard.saveDashboard(testData.dashboardTitle);
        });
      });
    }
  });
}
