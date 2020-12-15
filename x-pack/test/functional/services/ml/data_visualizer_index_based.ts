/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../plugins/ml/common/constants/field_types';
import { MlCommonUI } from './common_ui';
import { MlJobFieldType } from '../../../../plugins/ml/common/types/field_types';

export function MachineLearningDataVisualizerIndexBasedProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('mlDataVisualizerTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('mlDataVisualizerTotalDocCount');
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async clickUseFullDataButton(expectedFormattedTotalDocCount: string) {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
      await this.assertTotalDocumentCount(expectedFormattedTotalDocCount);
    },

    async assertTotalDocCountHeaderExist() {
      await testSubjects.existOrFail(`mlDataVisualizerTotalDocCountHeader`);
    },

    async assertTotalDocCountChartExist() {
      await testSubjects.existOrFail(`mlFieldDataCardDocumentCountChart`);
    },

    async assertSearchPanelExist() {
      await testSubjects.existOrFail(`mlDataVisualizerSearchPanel`);
    },

    async assertSearchQueryInputExist() {
      await testSubjects.existOrFail(`mlDataVisualizerQueryInput`);
    },

    async assertFieldCountPanelExist() {
      await testSubjects.existOrFail(`mlDataVisualizerFieldCountPanel`);
    },

    async assertMetricFieldsSummaryExist() {
      await testSubjects.existOrFail(`mlDataVisualizerMetricFieldsSummary`);
    },

    async assertVisibleMetricFieldsCount(count: number) {
      const expectedCount = count.toString();
      await testSubjects.existOrFail('mlDataVisualizerVisibleMetricFieldsCount');
      await retry.tryForTime(5000, async () => {
        const actualCount = await testSubjects.getVisibleText(
          'mlDataVisualizerVisibleMetricFieldsCount'
        );
        expect(expectedCount).to.eql(
          expectedCount,
          `Expected visible metric fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertTotalMetricFieldsCount(count: number) {
      const expectedCount = count.toString();
      await testSubjects.existOrFail('mlDataVisualizerMetricFieldsCount');
      await retry.tryForTime(5000, async () => {
        const actualCount = await testSubjects.getVisibleText(
          'mlDataVisualizerVisibleMetricFieldsCount'
        );
        expect(expectedCount).to.contain(
          expectedCount,
          `Expected total metric fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertVisibleFieldsCount(count: number) {
      const expectedCount = count.toString();
      await testSubjects.existOrFail('mlDataVisualizerVisibleFieldsCount');
      await retry.tryForTime(5000, async () => {
        const actualCount = await testSubjects.getVisibleText('mlDataVisualizerVisibleFieldsCount');
        expect(expectedCount).to.eql(
          expectedCount,
          `Expected fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertTotalFieldsCount(count: number) {
      const expectedCount = count.toString();
      await testSubjects.existOrFail('mlDataVisualizerTotalFieldsCount');
      await retry.tryForTime(5000, async () => {
        const actualCount = await testSubjects.getVisibleText('mlDataVisualizerTotalFieldsCount');
        expect(expectedCount).to.contain(
          expectedCount,
          `Expected total fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertFieldsSummaryExist() {
      await testSubjects.existOrFail(`mlDataVisualizerFieldsSummary`);
    },

    async assertDataVisualizerTableExist() {
      await testSubjects.existOrFail(`mlDataVisualizerTable`);
    },

    async assertShowEmptyFieldsSwitchExists() {
      await testSubjects.existOrFail('mlDataVisualizerShowEmptyFieldsSwitch');
    },

    async assertFieldNameInputExists() {
      await testSubjects.existOrFail('mlDataVisualizerFieldNameSelect');
    },

    async assertFieldTypeInputExists() {
      await testSubjects.existOrFail('mlDataVisualizerFieldTypeSelect');
    },

    async assertSampleSizeInputExists() {
      await testSubjects.existOrFail('mlDataVisualizerShardSizeSelect');
    },

    async setSampleSizeInputValue(
      sampleSize: number,
      cardType: string,
      fieldName: string,
      docCountFormatted: string
    ) {
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerShardSizeSelect');
      await testSubjects.existOrFail(`mlDataVisualizerShardSizeOption ${sampleSize}`);
      await testSubjects.click(`mlDataVisualizerShardSizeOption ${sampleSize}`);

      // TODO: update
      // await retry.tryForTime(5000, async () => {
      //   await this.assertFieldDocCountContents(cardType, fieldName, docCountFormatted);
      // });
    },

    async assertActionsPanelExists() {
      await testSubjects.existOrFail('mlDataVisualizerActionsPanel');
    },

    async assertActionsPanelNotExists() {
      await testSubjects.missingOrFail('mlDataVisualizerActionsPanel');
    },

    async assertCreateAdvancedJobCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCreateAdvancedJobCard');
    },

    async assertCreateAdvancedJobCardNotExists() {
      await testSubjects.missingOrFail('mlDataVisualizerCreateAdvancedJobCard');
    },

    async assertRecognizerCardExists(moduleId: string) {
      await testSubjects.existOrFail(`mlRecognizerCard ${moduleId}`);
    },

    async assertRecognizerCardNotExists(moduleId: string) {
      await testSubjects.missingOrFail(`mlRecognizerCard ${moduleId}`);
    },

    async clickCreateAdvancedJobButton() {
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerCreateAdvancedJobCard');
    },
  };
}
