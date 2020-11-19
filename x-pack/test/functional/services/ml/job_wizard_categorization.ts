/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../../../../plugins/ml/common/constants/categorization_job';

export function MachineLearningJobWizardCategorizationProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertCategorizationDetectorTypeSelectionExists() {
      await testSubjects.existOrFail('~mlJobWizardCategorizationDetectorCountCard');
      await testSubjects.existOrFail('~mlJobWizardCategorizationDetectorRareCard');
    },

    async selectCategorizationDetectorType(identifier: string) {
      const id = `~mlJobWizardCategorizationDetector${identifier}Card`;
      await testSubjects.existOrFail(id);
      await testSubjects.clickWhenNotDisabled(id);
      await testSubjects.existOrFail(`mlJobWizardCategorizationDetector${identifier}Card selected`);
    },

    async assertCategorizationFieldInputExists() {
      await testSubjects.existOrFail('mlCategorizationFieldNameSelect > comboBoxInput');
    },

    async selectCategorizationField(identifier: string) {
      await comboBox.set('mlCategorizationFieldNameSelect > comboBoxInput', identifier);

      await this.assertCategorizationFieldSelection([identifier]);
    },

    async assertCategorizationFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCategorizationFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected categorization field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async assertCategorizationExamplesCallout(status: CATEGORY_EXAMPLES_VALIDATION_STATUS) {
      await testSubjects.existOrFail(`mlJobWizardCategorizationExamplesCallout ${status}`);
    },

    async assertCategorizationExamplesTable(exampleCount: number) {
      const table = await testSubjects.find('mlJobWizardCategorizationExamplesTable');
      const body = await table.findAllByTagName('tbody');
      expect(body.length).to.eql(1, `Expected categorization field examples table to have a body`);
      const rows = await body[0].findAllByTagName('tr');
      expect(rows.length).to.eql(
        exampleCount,
        `Expected categorization field examples table to have '${exampleCount}' rows (got '${rows.length}')`
      );
    },
  };
}
