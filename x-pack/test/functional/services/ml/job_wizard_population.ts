/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobWizardPopulationProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertPopulationFieldInputExists() {
      await testSubjects.existOrFail('mlPopulationSplitFieldSelect > comboBoxInput');
    },

    async assertPopulationFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlPopulationSplitFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected population field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectPopulationField(identifier: string) {
      await comboBox.set('mlPopulationSplitFieldSelect > comboBoxInput', identifier);
      await this.assertPopulationFieldSelection([identifier]);
    },

    async assertDetectorSplitFieldInputExists(detectorPosition: number) {
      await testSubjects.existOrFail(
        `mlDetector ${detectorPosition} > mlByFieldSelect  > comboBoxInput`
      );
    },

    async assertDetectorSplitFieldSelection(
      detectorPosition: number,
      expectedIdentifier: string[]
    ) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        `mlDetector ${detectorPosition} > mlByFieldSelect  > comboBoxInput`
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector split field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectDetectorSplitField(detectorPosition: number, identifier: string) {
      await comboBox.set(
        `mlDetector ${detectorPosition} > mlByFieldSelect  > comboBoxInput`,
        identifier
      );
      await this.assertDetectorSplitFieldSelection(detectorPosition, [identifier]);
    },

    async assertDetectorSplitExists(detectorPosition: number) {
      await testSubjects.existOrFail(`mlDetector ${detectorPosition} > mlDataSplit`);
      await testSubjects.existOrFail(
        `mlDetector ${detectorPosition} > mlDataSplit > mlSplitCard front`
      );
    },

    async assertDetectorSplitFrontCardTitle(
      detectorPosition: number,
      expectedFrontCardTitle: string
    ) {
      const actualSplitFrontCardTitle = await testSubjects.getVisibleText(
        `mlDetector ${detectorPosition} > mlDataSplit > mlSplitCard front > mlSplitCardTitle`
      );
      expect(actualSplitFrontCardTitle).to.eql(
        expectedFrontCardTitle,
        `Expected front card title for detector position '${detectorPosition}' to be '${expectedFrontCardTitle}' (got '${actualSplitFrontCardTitle}')`
      );
    },

    async assertDetectorSplitNumberOfBackCards(
      detectorPosition: number,
      expectedNumberOfBackCards: number
    ) {
      const allBackCards = await testSubjects.findAll(
        `mlDetector ${detectorPosition} > mlDataSplit > mlSplitCard back`
      );
      expect(allBackCards).to.have.length(
        expectedNumberOfBackCards,
        `Expected number of back cards for detector position '${detectorPosition}' to be '${expectedNumberOfBackCards}' (got '${allBackCards.length}')`
      );
    },
  };
}
