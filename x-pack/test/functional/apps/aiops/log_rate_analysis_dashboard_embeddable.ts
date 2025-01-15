/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';

import { FtrProviderContext } from '../../ftr_provider_context';
import { logRateAnalysisTestData } from './log_rate_analysis_test_data';

const testDataSetup = logRateAnalysisTestData[0];
const testDataPanel = {
  type: 'testData',
  suiteSuffix: 'with multi metric job',
  panelTitle: `AIOps log rate analysis for ${testDataSetup.sourceIndexOrSavedSearch}`,
  dashboardTitle: `AIOps log rate analysis for ${
    testDataSetup.sourceIndexOrSavedSearch
  } ${Date.now()}`,
};
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'console',
    'dashboard',
    'header',
    'home',
    'security',
    'timePicker',
  ]);
  const aiops = getService('aiops');

  // AIOps / Log Rate Analysis lives in the ML UI so we need some related services.
  const ml = getService('ml');

  const from = 'Apr 16, 2023 @ 00:39:02.912';
  const to = 'Jun 15, 2023 @ 21:45:26.749';

  describe('log rate analysis in dashboard', function () {
    before(async () => {
      await aiops.logRateAnalysisDataGenerator.generateData(testDataSetup.dataGenerator);

      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      await ml.testResources.createDataViewIfNeeded(
        testDataSetup.sourceIndexOrSavedSearch,
        '@timestamp'
      );

      await PageObjects.common.setTime({ from, to });
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle(testDataSetup.sourceIndexOrSavedSearch);
      await aiops.logRateAnalysisDataGenerator.removeGeneratedData(testDataSetup.dataGenerator);
      await PageObjects.common.unsetTime();
    });

    describe(testDataPanel.suiteSuffix, function () {
      before(async () => {
        await PageObjects.dashboard.navigateToApp();
      });

      after(async () => {
        await ml.testResources.deleteDashboardByTitle(testDataPanel.dashboardTitle);
      });

      it('should open initializer flyout', async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await aiops.dashboardEmbeddables.assertDashboardIsEmpty();
        await aiops.dashboardEmbeddables.openEmbeddableInitializer(
          EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE
        );
      });

      it('should select data view', async () => {
        await aiops.dashboardEmbeddables.assertLogRateAnalysisEmbeddableDataViewSelectorExists();
        await aiops.dashboardEmbeddables.selectLogRateAnalysisEmbeddableDataView(
          testDataSetup.sourceIndexOrSavedSearch
        );
      });

      it('should create new log rate analysis panel', async () => {
        await aiops.dashboardEmbeddables.clickLogRateAnalysisInitializerConfirmButtonEnabled();
        await PageObjects.timePicker.pauseAutoRefresh();
        await aiops.dashboardEmbeddables.assertDashboardPanelExists(testDataPanel.panelTitle);
        await aiops.logRateAnalysisPage.assertAutoRunButtonExists();
        await PageObjects.dashboard.saveDashboard(testDataPanel.dashboardTitle);
      });

      it('should run log rate analysis', async () => {
        await aiops.dashboardEmbeddables.assertDashboardPanelExists(testDataPanel.panelTitle);
        await aiops.logRateAnalysisPage.clickAutoRunButton();
        // Wait for the analysis to finish
        await aiops.logRateAnalysisPage.assertAnalysisComplete(
          testDataSetup.analysisType,
          testDataSetup.dataGenerator
        );
      });
    });
  });
}
