/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProvidedType } from '@kbn/test/types/ftr';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MachineLearningAPIProvider } from './api';

import { JOB_STATE, DATAFEED_STATE } from '../../../../legacy/plugins/ml/common/constants/states';

export function MachineLearningJobManagementProvider(
  { getService }: FtrProviderContext,
  mlApi: ProvidedType<typeof MachineLearningAPIProvider>
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

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
      // this retry can be removed as soon as #48734 is merged
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('mlStartDatafeedModal');
      });
    },

    async confirmStartDatafeedModal() {
      await testSubjects.click('mlStartDatafeedModalStartButton');
      await testSubjects.missingOrFail('mlStartDatafeedModal');
    },

    async waitForJobCompletion(jobId: string) {
      await mlApi.waitForDatafeedState(`datafeed-${jobId}`, DATAFEED_STATE.STOPPED);
      await mlApi.waitForJobState(jobId, JOB_STATE.CLOSED);
    },
  };
}
