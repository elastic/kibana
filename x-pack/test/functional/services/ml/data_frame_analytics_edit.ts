/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommon } from './common';

export function MachineLearningDataFrameAnalyticsEditProvider(
  { getService }: FtrProviderContext,
  mlCommon: MlCommon
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertJobDescriptionEditInputExists() {
      await testSubjects.existOrFail('mlAnalyticsEditFlyoutDescriptionInput');
    },
    async assertJobDescriptionEditValue(expectedValue: string) {
      const actualJobDescription = await testSubjects.getAttribute(
        'mlAnalyticsEditFlyoutDescriptionInput',
        'value'
      );
      expect(actualJobDescription).to.eql(
        expectedValue,
        `Job description edit should be '${expectedValue}' (got '${actualJobDescription}')`
      );
    },
    async assertJobMmlEditInputExists() {
      await testSubjects.existOrFail('mlAnalyticsEditFlyoutmodelMemoryLimitInput');
    },
    async assertJobMmlEditValue(expectedValue: string) {
      const actualMml = await testSubjects.getAttribute(
        'mlAnalyticsEditFlyoutmodelMemoryLimitInput',
        'value'
      );
      expect(actualMml).to.eql(
        expectedValue,
        `Job model memory limit edit should be '${expectedValue}' (got '${actualMml}')`
      );
    },
    async setJobDescriptionEdit(jobDescription: string) {
      await mlCommon.setValueWithChecks('mlAnalyticsEditFlyoutDescriptionInput', jobDescription, {
        clearWithKeyboard: true,
      });
      await this.assertJobDescriptionEditValue(jobDescription);
    },

    async setJobMmlEdit(mml: string) {
      await mlCommon.setValueWithChecks('mlAnalyticsEditFlyoutmodelMemoryLimitInput', mml, {
        clearWithKeyboard: true,
      });
      await this.assertJobMmlEditValue(mml);
    },

    async assertAnalyticsEditFlyoutMissing() {
      await testSubjects.missingOrFail('mlAnalyticsEditFlyout');
    },

    async updateAnalyticsJob() {
      await testSubjects.existOrFail('mlAnalyticsEditFlyoutUpdateButton');
      await testSubjects.click('mlAnalyticsEditFlyoutUpdateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertAnalyticsEditFlyoutMissing();
      });
    },
  };
}
