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
      await testSubjects.existOrFail('populationSplitFieldSelect > comboBoxInput');
    },

    async assertPopulationFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'populationSplitFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectPopulationField(identifier: string) {
      await comboBox.set('populationSplitFieldSelect > comboBoxInput', identifier);
    },

    async assertDetectorSplitFieldInputExists(detectorPosition: number) {
      await testSubjects.existOrFail(
        `detector ${detectorPosition} > byFieldSelect  > comboBoxInput`
      );
    },

    async assertDetectorSplitFieldSelection(detectorPosition: number, identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        `detector ${detectorPosition} > byFieldSelect  > comboBoxInput`
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorSplitField(detectorPosition: number, identifier: string) {
      await comboBox.set(
        `detector ${detectorPosition} > byFieldSelect  > comboBoxInput`,
        identifier
      );
    },

    async assertDetectorSplitExists(detectorPosition: number) {
      await testSubjects.existOrFail(`detector ${detectorPosition} > dataSplit`);
      await testSubjects.existOrFail(`detector ${detectorPosition} > dataSplit > splitCard front`);
    },

    async assertDetectorSplitFrontCardTitle(detectorPosition: number, frontCardTitle: string) {
      expect(
        await testSubjects.getVisibleText(
          `detector ${detectorPosition} > dataSplit > splitCard front > splitCardTitle`
        )
      ).to.eql(frontCardTitle);
    },

    async assertDetectorSplitNumberOfBackCards(
      detectorPosition: number,
      numberOfBackCards: number
    ) {
      expect(
        await testSubjects.findAll(`detector ${detectorPosition} > dataSplit > splitCard back`)
      ).to.have.length(numberOfBackCards);
    },
  };
}
