/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobWizardMultiMetricProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertSplitFieldInputExists() {
      await testSubjects.existOrFail('mlMultiMetricSplitFieldSelect > comboBoxInput');
    },

    async assertSplitFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlMultiMetricSplitFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectSplitField(identifier: string) {
      await comboBox.set('mlMultiMetricSplitFieldSelect > comboBoxInput', identifier);
      await this.assertSplitFieldSelection([identifier]);
    },

    async assertDetectorSplitExists(splitField: string) {
      await testSubjects.existOrFail(`mlDataSplit > mlDataSplitTitle ${splitField}`);
      await testSubjects.existOrFail(`mlDataSplit > mlSplitCard front`);
    },

    async assertDetectorSplitFrontCardTitle(frontCardTitle: string) {
      expect(
        await testSubjects.getVisibleText(`mlDataSplit > mlSplitCard front > mlSplitCardTitle`)
      ).to.eql(frontCardTitle);
    },

    async assertDetectorSplitNumberOfBackCards(numberOfBackCards: number) {
      expect(await testSubjects.findAll(`mlDataSplit > mlSplitCard back`)).to.have.length(
        numberOfBackCards
      );
    },
  };
}
