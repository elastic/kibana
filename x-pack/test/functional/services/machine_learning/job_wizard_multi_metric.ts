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
      await testSubjects.existOrFail('multiMetricSplitFieldSelect > comboBoxInput');
    },

    async assertSplitFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'multiMetricSplitFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectSplitField(identifier: string) {
      await comboBox.set('multiMetricSplitFieldSelect > comboBoxInput', identifier);
      await this.assertSplitFieldSelection(identifier);
    },

    async assertDetectorSplitExists(splitField: string) {
      await testSubjects.existOrFail(`dataSplit > dataSplitTitle ${splitField}`);
      await testSubjects.existOrFail(`dataSplit > splitCard front`);
    },

    async assertDetectorSplitFrontCardTitle(frontCardTitle: string) {
      expect(
        await testSubjects.getVisibleText(`dataSplit > splitCard front > splitCardTitle`)
      ).to.eql(frontCardTitle);
    },

    async assertDetectorSplitNumberOfBackCards(numberOfBackCards: number) {
      expect(await testSubjects.findAll(`dataSplit > splitCard back`)).to.have.length(
        numberOfBackCards
      );
    },
  };
}
