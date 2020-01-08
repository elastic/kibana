/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlApi } from './api';

import { DATA_FRAME_TASK_STATE } from '../../../../legacy/plugins/ml/public/application/data_frame_analytics/pages/analytics_management/components/analytics_list/common';

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

    async assertAnalyticsStatsBarExists() {
      await testSubjects.existOrFail('mlAnalyticsStatsBar');
    },

    async startAnalyticsCreation() {
      if (await testSubjects.exists('mlNoDataFrameAnalyticsFound')) {
        await testSubjects.click('mlAnalyticsCreateFirstButton');
      } else {
        await testSubjects.click('mlAnalyticsButtonCreate');
      }
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyout');
    },

    async waitForAnalyticsCompletion(analyticsId: string) {
      await mlApi.waitForAnalyticsState(analyticsId, DATA_FRAME_TASK_STATE.STOPPED);
    },
  };
}
