/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { USER } from '../../services/ml/security_common';
import { logRateAnalysisTestData } from './log_rate_analysis_test_data';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const aiops = getService('aiops');
  const cases = getService('cases');

  const testData = logRateAnalysisTestData[0];

  // aiops lives in the ML UI so we need some related services.
  const ml = getService('ml');

  describe('log rate analysis in cases', function () {
    before(async () => {
      await aiops.logRateAnalysisDataGenerator.generateData(testData.dataGenerator);
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
      await ml.testResources.createDataViewIfNeeded(
        testData.sourceIndexOrSavedSearch,
        '@timestamp'
      );
      await elasticChart.setNewChartUiDebugFlag(true);
      await ml.navigation.navigateToMl();
    });

    after(async () => {
      await ml.testResources.deleteDataViewByTitle(testData.sourceIndexOrSavedSearch);
      await aiops.logRateAnalysisDataGenerator.removeGeneratedData(testData.dataGenerator);
      await elasticChart.setNewChartUiDebugFlag(false);
      await cases.api.deleteAllCases();
    });

    it('attaches log rate analysis to a case', async () => {
      await aiops.logRateAnalysisPage.navigateToDataViewSelection();
      await ml.jobSourceSelection.selectSourceForLogRateAnalysis(testData.sourceIndexOrSavedSearch);

      await aiops.logRateAnalysisPage.openAttachmentsMenu();
      await aiops.logRateAnalysisPage.assertAttachToCaseButtonDisabled();

      await aiops.logRateAnalysisPage.clickUseFullDataButton(
        testData.expected.totalDocCountFormatted
      );

      await aiops.logRateAnalysisPage.clickDocumentCountChart(testData.chartClickCoordinates);

      const caseParams = {
        title: 'Log rate analysis case',
        description: 'Case with log rate analysis attachment',
        tag: 'ml_log_rate_analysis',
        reporter: USER.ML_POWERUSER,
      };

      await aiops.logRateAnalysisPage.attachToCase(caseParams);

      await ml.cases.assertCaseWithLogRateAnalysisAttachment(caseParams);
    });
  });
}
