/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlApi } from './api';

import { DATA_FRAME_TASK_STATE } from '../../../../plugins/ml/common/constants/data_frame_analytics';

export function MachineLearningDataFrameAnalyticsProvider(
  { getService }: FtrProviderContext,
  mlApi: MlApi
) {
  const testSubjects = getService('testSubjects');

  return {
    async assertAnalyticsListPageExists() {
      await testSubjects.existOrFail('mlPageDataFrameAnalytics');
    },

    async assertEmptyListMessageExists() {
      await testSubjects.existOrFail('mlNoDataFrameAnalyticsFound');
    },

    async assertAnalyticsTableExists() {
      await testSubjects.existOrFail('~mlAnalyticsTable');
    },

    async assertCreateNewAnalyticsButtonExists() {
      await testSubjects.existOrFail('mlAnalyticsButtonCreate');
    },

    async assertCreateNewAnalyticsButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsButtonCreate');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected data frame analytics "create" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertAnalyticsStatsBarExists() {
      await testSubjects.existOrFail('mlAnalyticsStatsBar');
    },

    async startAnalyticsCreation() {
      if (await testSubjects.exists('mlNoDataFrameAnalyticsFound')) {
        await testSubjects.click('mlAnalyticsCreateFirstButton');
      } else {
        await testSubjects.click('mlAnalyticsButtonCreate');
      }
      await testSubjects.existOrFail('analyticsCreateSourceIndexModal');
    },

    async waitForAnalyticsCompletion(analyticsId: string) {
      await mlApi.waitForDFAJobTrainingRecordCountToBePositive(analyticsId);
      await mlApi.waitForAnalyticsState(analyticsId, DATA_FRAME_TASK_STATE.STOPPED);
    },
  };
}
