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
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
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
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
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

    async assertDetectorSplitFrontCardTitle(detectorPosition: number, frontCardTitle: string) {
      expect(
        await testSubjects.getVisibleText(
          `mlDetector ${detectorPosition} > mlDataSplit > mlSplitCard front > mlSplitCardTitle`
        )
      ).to.eql(frontCardTitle);
    },

    async assertDetectorSplitNumberOfBackCards(
      detectorPosition: number,
      numberOfBackCards: number
    ) {
      expect(
        await testSubjects.findAll(
          `mlDetector ${detectorPosition} > mlDataSplit > mlSplitCard back`
        )
      ).to.have.length(numberOfBackCards);
    },
  };
}
