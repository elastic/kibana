/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlApi } from './api';

import { JOB_STATE, DATAFEED_STATE } from '../../../../plugins/ml/common/constants/states';

export function MachineLearningJobManagementProvider(
  { getService }: FtrProviderContext,
  mlApi: MlApi
) {
  const testSubjects = getService('testSubjects');

  return {
    async navigateToNewJobSourceSelection() {
      await testSubjects.clickWhenNotDisabled('mlCreateNewJobButton');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },

    async assertJobTableExists() {
      await testSubjects.existOrFail('~mlJobListTable');
    },

    async assertCreateNewJobButtonExists() {
      await testSubjects.existOrFail('mlCreateNewJobButton');
    },

    async assertJobStatsBarExists() {
      await testSubjects.existOrFail('~mlJobStatsBar');
    },

    async assertStartDatafeedModalExists() {
      await testSubjects.existOrFail('mlStartDatafeedModal', { timeout: 5000 });
    },

    async confirmStartDatafeedModal() {
      await testSubjects.click('mlStartDatafeedModalStartButton');
      await testSubjects.missingOrFail('mlStartDatafeedModal');
    },

    async waitForJobCompletion(jobId: string) {
      await mlApi.waitForADJobRecordCountToBePositive(jobId);
      await mlApi.waitForDatafeedState(`datafeed-${jobId}`, DATAFEED_STATE.STOPPED);
      await mlApi.waitForJobState(jobId, JOB_STATE.CLOSED);
    },
  };
}
