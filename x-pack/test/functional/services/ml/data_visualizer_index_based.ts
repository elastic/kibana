/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import type { MlDataVisualizerTable } from './data_visualizer_table';
import { asyncForEach } from '../../apps/ml/settings/common';
import { ML_JOB_FIELD_TYPES } from '../../../../plugins/ml/common/constants/field_types';

export function MachineLearningDataVisualizerIndexBasedProvider(
  { getService }: FtrProviderContext,
  mlDataVisualizerTable: MlDataVisualizerTable
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
      await testSubjects.existOrFail(`mlFieldDataDocumentCountChart`);
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

    async assertShowEmptyFieldsCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlDataVisualizerShowEmptyFieldsSwitch',
          'aria-checked'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Show empty fields check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
      return actualCheckState === expectedCheckState;
    },

    async setShowEmptyFieldsSwitchState(checkState: boolean) {
      if (await this.assertShowEmptyFieldsCheckState(!checkState)) {
        await testSubjects.click('mlDataVisualizerShowEmptyFieldsSwitch');
      }
      await this.assertShowEmptyFieldsCheckState(checkState);
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
      fieldName: string,
      docCountFormatted: string
    ) {
      await this.assertSampleSizeInputExists();
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerShardSizeSelect');
      await testSubjects.existOrFail(`mlDataVisualizerShardSizeOption ${sampleSize}`);
      await testSubjects.click(`mlDataVisualizerShardSizeOption ${sampleSize}`);

      await retry.tryForTime(5000, async () => {
        await mlDataVisualizerTable.assertFieldDocCount(fieldName, docCountFormatted);
      });
    },

    async setFieldTypeFilter(fieldTypes: string[], expectedRowCount = 1) {
      await this.assertFieldNameInputExists();
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerFieldTypeSelect-button');
      await testSubjects.existOrFail('mlDataVisualizerFieldTypeSelect-popover');
      await testSubjects.existOrFail('mlDataVisualizerFieldTypeSelect-searchInput');
      const searchBarInput = await testSubjects.find(`mlDataVisualizerFieldTypeSelect-searchInput`);

      await asyncForEach(fieldTypes, async (fieldType) => {
        await retry.tryForTime(5000, async () => {
          await searchBarInput.clearValueWithKeyboard();
          await searchBarInput.type(fieldType);
          await testSubjects.existOrFail(`mlDataVisualizerFieldTypeSelect-option-${fieldType}`);
          await testSubjects.click(`mlDataVisualizerFieldTypeSelect-option-${fieldType}`);
        });
      });

      // escape popover
      await browser.pressKeys(browser.keys.ESCAPE);
      await mlDataVisualizerTable.assertTableRowCount(expectedRowCount);
    },

    async removeFieldTypeFilter(fieldTypes: string[], expectedRowCount = 1) {
      await this.setFieldTypeFilter(fieldTypes, expectedRowCount);
    },

    async setFieldNameFilter(fieldNames: string[], expectedRowCount = 1) {
      await this.assertFieldNameInputExists();
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerFieldNameSelect-button');
      await testSubjects.existOrFail('mlDataVisualizerFieldNameSelect-popover');
      await testSubjects.existOrFail('mlDataVisualizerFieldNameSelect-searchInput');
      const searchBarInput = await testSubjects.find(`mlDataVisualizerFieldNameSelect-searchInput`);

      await asyncForEach(fieldNames, async (filterString) => {
        await retry.tryForTime(5000, async () => {
          await searchBarInput.clearValueWithKeyboard();
          await searchBarInput.type(filterString);
          await testSubjects.existOrFail(`mlDataVisualizerFieldNameSelect-option-${filterString}`);
          await testSubjects.click(`mlDataVisualizerFieldNameSelect-option-${filterString}`);
        });
      });
      await browser.pressKeys(browser.keys.ESCAPE);
      await mlDataVisualizerTable.assertTableRowCount(expectedRowCount);
    },

    async removeFieldNameFilter(fieldNames: string[], expectedRowCount: number) {
      await this.setFieldNameFilter(fieldNames, expectedRowCount);
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

    async assertTopValuesContents(fieldName: string, expectedTopValuesCount: number) {
      const selector = mlDataVisualizerTable.detailsSelector(fieldName, 'mlFieldDataTopValues');
      const topValuesElement = await testSubjects.find(selector);
      const topValuesBars = await topValuesElement.findAllByTestSubject('mlFieldDataTopValueBar');
      expect(topValuesBars).to.have.length(
        expectedTopValuesCount,
        `Expected top values count for field '${fieldName}' to be '${expectedTopValuesCount}' (got '${topValuesBars.length}')`
      );
    },

    async assertDistributionPreviewExist(fieldName: string) {
      await testSubjects.existOrFail(
        mlDataVisualizerTable.rowSelector(fieldName, `mlDataGridChart-${fieldName}`)
      );
      await testSubjects.existOrFail(
        mlDataVisualizerTable.rowSelector(fieldName, `mlDataGridChart-${fieldName}-histogram`)
      );
    },

    async assertNumberFieldContents(
      fieldName: string,
      docCountFormatted: string,
      topValuesCount: number
    ) {
      await mlDataVisualizerTable.assertRowExists(fieldName);
      await mlDataVisualizerTable.assertFieldDocCount(fieldName, docCountFormatted);
      await mlDataVisualizerTable.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        mlDataVisualizerTable.detailsSelector(fieldName, 'mlNumberSummaryTable')
      );

      await testSubjects.existOrFail(
        mlDataVisualizerTable.detailsSelector(fieldName, 'mlTopValues')
      );
      await this.assertTopValuesContents(fieldName, topValuesCount);

      await this.assertDistributionPreviewExist(fieldName);

      await mlDataVisualizerTable.ensureDetailsClosed(fieldName);
    },

    async assertDateFieldContents(fieldName: string, docCountFormatted: string) {
      await mlDataVisualizerTable.assertRowExists(fieldName);
      await mlDataVisualizerTable.assertFieldDocCount(fieldName, docCountFormatted);
      await mlDataVisualizerTable.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        mlDataVisualizerTable.detailsSelector(fieldName, 'mlDateSummaryTable')
      );
      await mlDataVisualizerTable.ensureDetailsClosed(fieldName);
    },

    async assertKeywordFieldContents(
      fieldName: string,
      docCountFormatted: string,
      topValuesCount: number
    ) {
      await mlDataVisualizerTable.assertRowExists(fieldName);
      await mlDataVisualizerTable.assertFieldDocCount(fieldName, docCountFormatted);
      await mlDataVisualizerTable.ensureDetailsOpen(fieldName);

      await testSubjects.existOrFail(
        mlDataVisualizerTable.detailsSelector(fieldName, 'mlFieldDataTopValues')
      );
      await this.assertTopValuesContents(fieldName, topValuesCount);
      await mlDataVisualizerTable.ensureDetailsClosed(fieldName);
    },

    async assertTextFieldContents(
      fieldName: string,
      docCountFormatted: string,
      expectedExamplesCount: number
    ) {
      await mlDataVisualizerTable.assertRowExists(fieldName);
      await mlDataVisualizerTable.assertFieldDocCount(fieldName, docCountFormatted);
      await mlDataVisualizerTable.ensureDetailsOpen(fieldName);

      const examplesList = await testSubjects.find(
        mlDataVisualizerTable.detailsSelector(fieldName, 'mlFieldDataExamplesList')
      );
      const examplesListItems = await examplesList.findAllByTagName('li');
      expect(examplesListItems).to.have.length(
        expectedExamplesCount,
        `Expected example list item count for field '${fieldName}' to be '${expectedExamplesCount}' (got '${examplesListItems.length}')`
      );
      await mlDataVisualizerTable.ensureDetailsClosed(fieldName);
    },

    async assertNonMetricFieldContents(
      fieldType: string,
      fieldName: string,
      docCountFormatted: string,
      exampleCount: number
    ) {
      // Currently the data used in the data visualizer tests only contains these field types.
      if (fieldType === ML_JOB_FIELD_TYPES.DATE) {
        await this.assertDateFieldContents(fieldName, docCountFormatted);
      } else if (fieldType === ML_JOB_FIELD_TYPES.KEYWORD) {
        await this.assertKeywordFieldContents(fieldName, docCountFormatted, exampleCount);
      } else if (fieldType === ML_JOB_FIELD_TYPES.TEXT) {
        await this.assertTextFieldContents(fieldName, docCountFormatted, exampleCount);
      }
    },
  };
}
