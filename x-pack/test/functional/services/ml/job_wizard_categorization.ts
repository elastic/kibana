/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '@kbn/ml-category-validator';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { MlCommonFieldStatsFlyout } from './field_stats_flyout';
import type { MlCommonUI } from './common_ui';

export function MachineLearningJobWizardCategorizationProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  mlCommonFieldStatsFlyout: MlCommonFieldStatsFlyout
) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertCategorizationDetectorTypeSelectionExists() {
      await testSubjects.existOrFail('~mlJobWizardCategorizationDetectorCountCard');
      await testSubjects.existOrFail('~mlJobWizardCategorizationDetectorHighCountCard');
      await testSubjects.existOrFail('~mlJobWizardCategorizationDetectorRareCard');
    },

    async selectCategorizationDetectorType(identifier: string) {
      const id = `~mlJobWizardCategorizationDetector${identifier}Card`;
      await testSubjects.existOrFail(id);
      await testSubjects.clickWhenNotDisabledWithoutRetry(id);
      await testSubjects.existOrFail(`mlJobWizardCategorizationDetector${identifier}Card selected`);
    },

    async assertCategorizationFieldInputExists() {
      await testSubjects.existOrFail('mlCategorizationFieldNameSelect > comboBoxInput');
    },

    async assertFieldStatFlyoutContentFromCategorizationFieldInputTrigger(
      fieldName: string,
      fieldType: 'keyword' | 'date' | 'number',
      expectedTopValues?: string[]
    ) {
      await mlCommonFieldStatsFlyout.assertFieldStatFlyoutContentFromComboBoxTrigger(
        'mlCategorizationFieldNameSelect',
        fieldName,
        fieldType,
        expectedTopValues
      );
    },

    async selectCategorizationField(identifier: string) {
      await mlCommonUI.setOptionsListWithFieldStatsValue(
        'mlCategorizationFieldNameSelect > comboBoxInput',
        identifier
      );

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
