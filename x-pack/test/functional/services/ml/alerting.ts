/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlApi } from './api';
import { MlCommonUI } from './common_ui';
import { ML_ALERT_TYPES } from '../../../../plugins/ml/common/constants/alerts';
import { Rule } from '../../../../plugins/alerting/common';
import { MlAnomalyDetectionAlertParams } from '../../../../plugins/ml/common/types/alerts';

export function MachineLearningAlertingProvider(
  { getService }: FtrProviderContext,
  mlApi: MlApi,
  mlCommonUI: MlCommonUI
) {
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const supertest = getService('supertest');

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
      await testSubjects.setValue('mlAnomalyAlertPreviewInterval', interval);
      await this.assertTestIntervalValue(interval);
    },

    async assertTestIntervalValue(expectedInterval: string) {
      const actualValue = await testSubjects.getAttribute('mlAnomalyAlertPreviewInterval', 'value');
      expect(actualValue).to.eql(
        expectedInterval,
        `Expected test interval to equal ${expectedInterval}, got ${actualValue}`
      );
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

    async checkPreview(expectedMessagePattern: RegExp) {
      await this.clickPreviewButton();
      const previewMessage = await testSubjects.getVisibleText('mlAnomalyAlertPreviewMessage');
      expect(previewMessage).to.match(expectedMessagePattern);
    },

    async assertPreviewCalloutVisible() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlAnomalyAlertPreviewCallout`);
      });
    },

    async assertLookbackInterval(expectedValue: string) {
      await this.ensureAdvancedSectionOpen();
      const actualValue = await testSubjects.getAttribute(
        'mlAnomalyAlertLookbackInterval',
        'value'
      );
      expect(actualValue).to.eql(
        expectedValue,
        `Expected lookback interval to equal ${expectedValue}, got ${actualValue}`
      );
    },

    async assertTopNBuckets(expectedNumberOfBuckets: number) {
      await this.ensureAdvancedSectionOpen();
      const actualValue = await testSubjects.getAttribute('mlAnomalyAlertTopNBuckets', 'value');
      expect(actualValue).to.eql(
        expectedNumberOfBuckets,
        `Expected number of buckets to equal ${expectedNumberOfBuckets}, got ${actualValue}`
      );
    },

    async setLookbackInterval(interval: string) {
      await this.ensureAdvancedSectionOpen();
      await testSubjects.setValue('mlAnomalyAlertLookbackInterval', interval);
      await this.assertLookbackInterval(interval);
    },

    async setTopNBuckets(numberOfBuckets: number) {
      await this.ensureAdvancedSectionOpen();
      await testSubjects.setValue('mlAnomalyAlertTopNBuckets', numberOfBuckets.toString());
      await this.assertTopNBuckets(numberOfBuckets);
    },

    async isAdvancedSectionOpened() {
      return await find.existsByDisplayedByCssSelector('#mlAnomalyAlertAdvancedSettings');
    },

    async ensureAdvancedSectionOpen() {
      await retry.tryForTime(5000, async () => {
        if (!(await this.isAdvancedSectionOpened())) {
          await testSubjects.click('mlAnomalyAlertAdvancedSettingsTrigger');
          expect(await this.isAdvancedSectionOpened()).to.eql(true);
        }
      });
    },

    async cleanAnomalyDetectionRules() {
      const { body: anomalyDetectionRules, status: findResponseStatus } = await supertest
        .get(`/api/alerting/rules/_find`)
        .query({ filter: `alert.attributes.alertTypeId:${ML_ALERT_TYPES.ANOMALY_DETECTION}` })
        .set('kbn-xsrf', 'foo');
      mlApi.assertResponseStatusCode(200, findResponseStatus, anomalyDetectionRules);

      for (const rule of anomalyDetectionRules.data as Array<Rule<MlAnomalyDetectionAlertParams>>) {
        const { body, status } = await supertest
          .delete(`/api/alerting/rule/${rule.id}`)
          .set('kbn-xsrf', 'foo');
        mlApi.assertResponseStatusCode(204, status, body);
      }
    },
  };
}
