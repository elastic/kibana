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
    panelTitle: `ML single metric viewer for ${JOB_CONFIG.job_id}`,
    jobConfig: JOB_CONFIG,
    datafeedConfig: DATAFEED_CONFIG,
    dashboardTitle: `ML single metric viewer for fq_multi_1_ae ${Date.now()}`,
    expected: { detectorInputValue: '0', entityInputLabel: 'airline', entityInputValue: 'AAL' },
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);
  const from = 'Feb 7, 2016 @ 00:00:00.000';
  const to = 'Feb 11, 2016 @ 00:00:00.000';

  describe('single metric viewer in dashboard', function () {
    this.tags(['ml']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
      await PageObjects.common.setTime({ from, to });
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
      await PageObjects.common.unsetTime();
    });

    for (const testData of testDataList) {
      describe(testData.suiteSuffix, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
          await PageObjects.dashboard.navigateToApp();
        });

        after(async () => {
          await ml.testResources.deleteDashboardByTitle(testData.dashboardTitle);
        });

        it('can open job selection flyout', async () => {
          await PageObjects.dashboard.clickNewDashboard();
          await ml.dashboardEmbeddables.assertDashboardIsEmpty();
          await ml.dashboardEmbeddables.openAnomalyJobSelectionFlyout(
            ML_EMBEDDABLE_TYPES.ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE
          );
        });

        it('can select jobs', async () => {
          await ml.dashboardJobSelectionTable.setRowRadioButtonState(
            testData.jobConfig.job_id,
            true
          );
          await ml.dashboardJobSelectionTable.applyJobSelection();
        });

        it('can configure single metric viewer panel', async () => {
          await ml.dashboardEmbeddables.assertSingleMetricViewerEmbeddableInitializerExists();
          await ml.singleMetricViewer.assertDetectorInputExist();
          await ml.singleMetricViewer.assertDetectorInputValue(
            testData.expected.detectorInputValue
          );
          await ml.singleMetricViewer.assertEntityInputExist(testData.expected.entityInputLabel);
          await ml.singleMetricViewer.selectEntityValue(
            testData.expected.entityInputLabel,
            testData.expected.entityInputValue
          );
        });

        it('create new single metric viewer panel', async () => {
          await ml.dashboardEmbeddables.clickSingleMetricViewerInitializerConfirmButtonEnabled();
          await PageObjects.timePicker.pauseAutoRefresh();
          await ml.dashboardEmbeddables.assertDashboardPanelExists(testData.panelTitle);
          await ml.singleMetricViewer.assertChartExist();
          await ml.singleMetricViewer.assertAnomalyMarkerExist();
          await PageObjects.dashboard.saveDashboard(testData.dashboardTitle);
        });
      });
    }
  });
}
