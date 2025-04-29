/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningOverviewPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  return {
    async assertADEmptyStateExists() {
      await testSubjects.existOrFail('mlAnomalyDetectionEmptyState');
    },

    async assertADCardExists() {
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.existOrFail('mlOverviewAnomalyDetectionCard');
      });
    },

    async assertADCreateJobButtonExists(expectExists: boolean = true) {
      if (expectExists) {
        await testSubjects.existOrFail('mlCreateNewJobButton');
      } else {
        await testSubjects.missingOrFail('mlCreateNewJobButton');
      }
    },

    async assertADManageJobsButtonExists(expectExists: boolean = true) {
      if (expectExists) {
        await testSubjects.existOrFail('manageJobsButton');
      } else {
        await testSubjects.missingOrFail('manageJobsButton');
      }
    },

    async assertADJobButtonEnabled(subject: string, expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(subject);
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD "Create job" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertAdJobsOverviewPanelExist() {
      await testSubjects.existOrFail('mlOverviewTableAnomalyDetection');
    },

    async assertDFAEmptyStateExists() {
      await testSubjects.existOrFail('mlNoDataFrameAnalyticsFound');
    },

    async assertIndexDataVisualizerCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardIndexData');
    },

    async assertLogPatternAnalysisCardExists() {
      await testSubjects.existOrFail('mlOverviewCardLogPatternAnalysis');
    },

    async assertChangePointDetectionCardExists() {
      await testSubjects.existOrFail('mlOverviewCardChangePointDetection');
    },

    async assertTryESQLCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerSelectESQLCard');
    },

    async assertDataVisualizerImportCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardImportData');
    },

    async assertDataVisualizerImportIndexCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardIndexData');
    },

    async assertDataDriftCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCardDataDriftData');
    },

    async assertDFACreateJobButtonExists(expectExists: boolean = true) {
      if (expectExists) {
        await testSubjects.existOrFail('mlAnalyticsCreateFirstButton');
      } else {
        await testSubjects.missingOrFail('mlAnalyticsCreateFirstButton');
      }
    },

    async assertAnomalyDetectionPanelExists() {
      await testSubjects.existOrFail('mlAnomalyDetectionPanel');
    },

    async assertDFAPanelExists(expectPanelExits: boolean = true) {
      if (expectPanelExits) {
        await testSubjects.existOrFail('mlDataFrameAnalyticsPanel');
      } else {
        await testSubjects.missingOrFail('mlDataFrameAnalyticsPanel');
      }
    },

    async assertAnomalyDetectionPanelTableRowCount(count: number) {
      const rows = await find.allByCssSelector(
        `[data-test-subj="mlOverviewTableAnomalyDetection"] .euiTableRow`
      );
      expect(rows.length).to.eql(count);
    },

    async assertDFACreateJobButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsCreateFirstButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected AD "Create job" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertDFAJobsOverviewPanelExist() {
      await testSubjects.existOrFail('mlOverviewTableAnalytics');
    },

    async assertJobSyncRequiredWarningExists() {
      await testSubjects.existOrFail('mlJobSyncRequiredWarning', { timeout: 5000 });
    },

    async assertJobSyncRequiredWarningNotExists() {
      await testSubjects.missingOrFail('mlJobSyncRequiredWarning', { timeout: 5000 });
    },

    async assertPageNotFoundBannerExists() {
      await testSubjects.existOrFail('mlPageNotFoundBanner', { timeout: 5000 });
    },

    async assertPageNotFoundBannerText(pathname: string) {
      await this.assertPageNotFoundBannerExists();
      const text = await testSubjects.getVisibleText('mlPageNotFoundBannerText');
      expect(text).to.eql(
        `The Machine Learning application doesn't recognize this route: /${pathname}. You've been redirected to the Overview page.`
      );
    },
  };
}
