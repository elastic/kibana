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

  return {
    async assertGettingStartedCalloutVisible(expectVisible: boolean = true) {
      if (expectVisible) {
        await testSubjects.existOrFail('mlGettingStartedCallout');
      } else {
        await testSubjects.missingOrFail('mlGettingStartedCallout');
      }
    },

    async dismissGettingStartedCallout() {
      await this.assertGettingStartedCalloutVisible(true);
      await testSubjects.click('mlDismissGettingStartedCallout');
      await this.assertGettingStartedCalloutVisible(false);
    },

    async assertADEmptyStateExists() {
      await testSubjects.existOrFail('mlAnomalyDetectionEmptyState');
    },

    async assertADCreateJobButtonExists() {
      await testSubjects.existOrFail('mlCreateNewJobButton');
    },

    async assertADCreateJobButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlCreateNewJobButton');
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

    async assertDFACreateJobButtonExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateFirstButton');
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
  };
}
