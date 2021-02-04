/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningAlertingProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async selectAnomalyDetectionAlertType() {
      await testSubjects.click('xpack.ml.anomaly_detection_alert-SelectOption');
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlAnomalyAlertForm`);
      });
    },

    async selectJobs(jobIds: string[]) {
      for (const jobId of jobIds) {
        await comboBox.set('mlAnomalyAlertJobSelection > comboBoxInput', jobId);
      }
      await this.assertJobSelection(jobIds);
    },

    async assertJobSelection(expectedJobIds: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAnomalyAlertJobSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedJobIds,
        `Expected job selection to be '${expectedJobIds}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectResultType(resultType: string) {
      await testSubjects.click(`mlAnomalyAlertResult_${resultType}`);
      await this.assertResultTypeSelection(resultType);
    },

    async assertResultTypeSelection(resultType: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlAnomalyAlertResult_${resultType}_selected`);
      });
    },

    async setSeverity(severity: number) {
      await mlCommonUI.setSliderValue('mlAnomalyAlertScoreSelection', severity);
    },

    async assertSeverity(expectedValue: number) {
      await mlCommonUI.assertSliderValue('mlAnomalyAlertScoreSelection', expectedValue);
    },

    async setTestInterval(interval: string) {
      await testSubjects.setValue('mlAnomalyAlertPreviewInterval', '6m');
    },

    async assertPreviewButtonState(expectedEnabled: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlAnomalyAlertPreviewButton');
      expect(isEnabled).to.eql(
        expectedEnabled,
        `Expected data frame analytics "create" button to be '${
          expectedEnabled ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async clickPreviewButton() {
      await testSubjects.click('mlAnomalyAlertPreviewButton');
      await this.assertPreviewCalloutVisible();
    },

    async assertPreviewCalloutVisible() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlAnomalyAlertPreviewCallout`);
      });
    },
  };
}
