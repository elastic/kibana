/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { ML_JOB_FIELD_TYPES } from '../../../../plugins/ml/common/constants/field_types';

export function MachineLearningDataVisualizerIndexBasedProvider({
  getService,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('mlDataVisualizerTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(expectedTotalDocCount: number) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('mlDataVisualizerTotalDocCount');
        expect(docCount).to.eql(
          expectedTotalDocCount,
          `Expected total document count to be '${expectedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async clickUseFullDataButton(expectedTotalDocCount: number) {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
      await this.assertTotalDocumentCount(expectedTotalDocCount);
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

    async clickCreateAdvancedJobButton() {
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerCreateAdvancedJobCard');
    },
  };
}
