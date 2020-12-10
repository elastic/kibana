/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../plugins/ml/common/constants/field_types';
import { MlCommonUI } from './common_ui';

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

    async assertFieldsPanelsExist(expectedPanelCount: number) {
      const allPanels = await testSubjects.findAll('~mlDataVisualizerFieldsPanel');
      expect(allPanels).to.have.length(
        expectedPanelCount,
        `Expected field panels count to be '${expectedPanelCount}' (got '${allPanels.length}')`
      );
    },

    async assertFieldsPanelForTypesExist(fieldTypes: ML_JOB_FIELD_TYPES[]) {
      await testSubjects.existOrFail(`mlDataVisualizerFieldsPanel ${fieldTypes}`);
    },

    async assertCardExists(cardType: string, fieldName?: string) {
      await testSubjects.existOrFail(`mlFieldDataCard ${fieldName} ${cardType}`);
    },

    async assertCardContentsExists(cardType: string, fieldName?: string) {
      await testSubjects.existOrFail(
        `mlFieldDataCard ${fieldName} ${cardType} > mlFieldDataCardContent`
      );
    },

    async assertNonMetricCardContents(cardType: string, fieldName: string, exampleCount?: number) {
      await this.assertCardContentsExists(cardType, fieldName);

      // Currently the data used in the data visualizer tests only contains these field types.
      if (cardType === ML_JOB_FIELD_TYPES.DATE) {
        await this.assertDateCardContents(fieldName);
      } else if (cardType === ML_JOB_FIELD_TYPES.KEYWORD) {
        await this.assertKeywordCardContents(fieldName, exampleCount!);
      } else if (cardType === ML_JOB_FIELD_TYPES.TEXT) {
        await this.assertTextCardContents(fieldName, exampleCount!);
      }
    },

    async assertDocumentCountCardContents() {
      await this.assertCardContentsExists('number', undefined);
      await testSubjects.existOrFail(
        'mlFieldDataCard undefined number > mlFieldDataCardDocumentCountChart'
      );
    },

    async assertNumberCardContents(
      fieldName: string,
      docCountFormatted: string,
      statsMaxDecimalPlaces: number,
      selectedDetailsMode: 'distribution' | 'top_values',
      topValuesCount: number
    ) {
      await this.assertCardContentsExists('number', fieldName);
      await this.assertFieldDocCountExists('number', fieldName);
      await this.assertFieldDocCountContents('number', fieldName, docCountFormatted);
      await this.assertFieldCardinalityExists('number', fieldName);

      await this.assertNumberStatsContents(fieldName, 'Min', statsMaxDecimalPlaces);
      await this.assertNumberStatsContents(fieldName, 'Median', statsMaxDecimalPlaces);
      await this.assertNumberStatsContents(fieldName, 'Max', statsMaxDecimalPlaces);

      await testSubjects.existOrFail(
        `mlFieldDataCard ${fieldName} number > mlFieldDataCardDetailsSelect`
      );

      if (selectedDetailsMode === 'distribution') {
        await mlCommonUI.assertRadioGroupValue(
          `mlFieldDataCard ${fieldName} number > mlFieldDataCardDetailsSelect`,
          'distribution'
        );
        await testSubjects.existOrFail(
          `mlFieldDataCard ${fieldName} number > mlFieldDataCardMetricDistributionChart`
        );

        await mlCommonUI.selectRadioGroupValue(
          `mlFieldDataCard ${fieldName} number > mlFieldDataCardDetailsSelect`,
          'top_values'
        );
        await this.assertTopValuesContents('number', fieldName, topValuesCount);
      } else {
        await mlCommonUI.assertRadioGroupValue(
          `mlFieldDataCard ${fieldName} number > mlFieldDataCardDetailsSelect`,
          'top_values'
        );
        await this.assertTopValuesContents('number', fieldName, topValuesCount);

        await mlCommonUI.selectRadioGroupValue(
          `mlFieldDataCard ${fieldName} number > mlFieldDataCardDetailsSelect`,
          'distribution'
        );
        await testSubjects.existOrFail(
          `mlFieldDataCard ${fieldName} number > mlFieldDataCardMetricDistributionChart`
        );
      }
    },

    async assertDateCardContents(fieldName: string) {
      await this.assertFieldDocCountExists('date', fieldName);
      await testSubjects.existOrFail(`mlFieldDataCard ${fieldName} date > mlFieldDataCardEarliest`);
      await testSubjects.existOrFail(`mlFieldDataCard ${fieldName} date > mlFieldDataCardLatest`);
    },

    async assertKeywordCardContents(fieldName: string, expectedTopValuesCount: number) {
      await this.assertFieldDocCountExists('keyword', fieldName);
      await this.assertFieldCardinalityExists('keyword', fieldName);
      await this.assertTopValuesContents('keyword', fieldName, expectedTopValuesCount);
    },

    async assertTextCardContents(fieldName: string, expectedExamplesCount: number) {
      const examplesList = await testSubjects.find(
        `mlFieldDataCard ${fieldName} text > mlFieldDataCardExamplesList`
      );
      const examplesListItems = await examplesList.findAllByTagName('li');
      expect(examplesListItems).to.have.length(
        expectedExamplesCount,
        `Expected example list item count for field '${fieldName}' to be '${expectedExamplesCount}' (got '${examplesListItems.length}')`
      );
    },

    async assertFieldDocCountExists(cardType: string, fieldName: string) {
      await testSubjects.existOrFail(
        `mlFieldDataCard ${fieldName} ${cardType} > mlFieldDataCardDocCount`
      );
    },

    async assertFieldDocCountContents(
      cardType: string,
      fieldName: string,
      docCountFormatted: string
    ) {
      const docCountText = await testSubjects.getVisibleText(
        `mlFieldDataCard ${fieldName} ${cardType} > mlFieldDataCardDocCount`
      );
      expect(docCountText).to.contain(
        docCountFormatted,
        `Expected doc count for '${fieldName}'  to be '${docCountFormatted}' (got contents '${docCountText}')`
      );
    },

    async assertFieldCardinalityExists(cardType: string, fieldName: string) {
      await testSubjects.existOrFail(
        `mlFieldDataCard ${fieldName} ${cardType} > mlFieldDataCardCardinality`
      );
    },

    async assertNumberStatsContents(
      fieldName: string,
      stat: 'Min' | 'Median' | 'Max',
      maxDecimalPlaces: number
    ) {
      const statElement = await testSubjects.find(
        `mlFieldDataCard ${fieldName} number > mlFieldDataCard${stat}`
      );
      const statValue = await statElement.getVisibleText();
      const dotIdx = statValue.indexOf('.');
      const numDecimalPlaces = dotIdx === -1 ? 0 : statValue.length - dotIdx - 1;
      expect(numDecimalPlaces).to.be.lessThan(
        maxDecimalPlaces + 1,
        `Expected number of decimal places for '${fieldName}' '${stat}' to be less than or equal to '${maxDecimalPlaces}' (got '${numDecimalPlaces}')`
      );
    },

    async assertTopValuesContents(
      cardType: string,
      fieldName: string,
      expectedTopValuesCount: number
    ) {
      const topValuesElement = await testSubjects.find(
        `mlFieldDataCard ${fieldName} ${cardType} > mlFieldDataCardTopValues`
      );
      const topValuesBars = await topValuesElement.findAllByTestSubject(
        'mlFieldDataCardTopValueBar'
      );
      expect(topValuesBars).to.have.length(
        expectedTopValuesCount,
        `Expected top values count for field '${fieldName}' to be '${expectedTopValuesCount}' (got '${topValuesBars.length}')`
      );
    },

    async assertFieldsPanelCardCount(panelFieldTypes: string[], expectedCardCount: number) {
      await retry.tryForTime(5000, async () => {
        const filteredCards = await testSubjects.findAll(
          `mlDataVisualizerFieldsPanel ${panelFieldTypes} > ~mlFieldDataCard`
        );
        expect(filteredCards).to.have.length(
          expectedCardCount,
          `Expected field card count for panels '${panelFieldTypes}' to be '${expectedCardCount}' (got '${filteredCards.length}')`
        );
      });
    },

    async assertFieldsPanelSearchInputValue(fieldTypes: string[], expectedSearchValue: string) {
      const searchBar = await testSubjects.find(
        `mlDataVisualizerFieldsPanel ${fieldTypes} > mlDataVisualizerFieldsSearchBarDiv`
      );
      const searchBarInput = await searchBar.findByTagName('input');
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Expected search value for field types '${fieldTypes}' to be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    },

    async clearFieldsPanelSearchInput(fieldTypes: string[]) {
      const searchBar = await testSubjects.find(
        `mlDataVisualizerFieldsPanel ${fieldTypes} > mlDataVisualizerFieldsSearchBarDiv`
      );
      const searchBarInput = await searchBar.findByTagName('input');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.pressKeys(browser.keys.ENTER);
    },

    async filterFieldsPanelWithSearchString(
      fieldTypes: string[],
      filter: string,
      expectedCardCount: number
    ) {
      const searchBar = await testSubjects.find(
        `mlDataVisualizerFieldsPanel ${fieldTypes} > mlDataVisualizerFieldsSearchBarDiv`
      );
      const searchBarInput = await searchBar.findByTagName('input');
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await searchBarInput.pressKeys(browser.keys.ENTER);
      await this.assertFieldsPanelSearchInputValue(fieldTypes, filter);

      await this.assertFieldsPanelCardCount(fieldTypes, expectedCardCount);
    },

    async assertFieldsPanelTypeInputExists(panelFieldTypes: string[]) {
      await testSubjects.existOrFail(
        `mlDataVisualizerFieldsPanel ${panelFieldTypes} > mlDataVisualizerFieldTypesSelect`
      );
    },

    async assertFieldsPanelTypeInputValue(expectedTypeValue: string) {
      const actualTypeValue = await testSubjects.getAttribute(
        'mlDataVisualizerFieldTypesSelect',
        'value'
      );
      expect(actualTypeValue).to.eql(
        expectedTypeValue,
        `Expected fields panel type value to be '${expectedTypeValue}' (got '${actualTypeValue}')`
      );
    },

    async setFieldsPanelTypeInputValue(
      panelFieldTypes: string[],
      filterFieldType: string,
      expectedCardCount: number
    ) {
      await testSubjects.selectValue('mlDataVisualizerFieldTypesSelect', filterFieldType);
      await this.assertFieldsPanelTypeInputValue(filterFieldType);
      await this.assertFieldsPanelCardCount(panelFieldTypes, expectedCardCount);
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

      await retry.tryForTime(5000, async () => {
        await this.assertFieldDocCountContents(cardType, fieldName, docCountFormatted);
      });
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
