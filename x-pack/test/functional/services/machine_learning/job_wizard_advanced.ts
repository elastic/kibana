/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobWizardAdvancedProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const aceEditor = getService('aceEditor');

  return {
    async assertDatafeedQueryEditorExists() {
      await testSubjects.existOrFail('mlAdvancedDatafeedQueryEditor > codeEditorContainer');
    },

    async assertDatafeedQueryEditorValue(expectedValue: string) {
      const actualValue = await aceEditor.getValue(
        'mlAdvancedDatafeedQueryEditor > codeEditorContainer'
      );
      expect(actualValue).to.eql(expectedValue);
    },

    async assertQueryDelayInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputQueryDelay');
    },

    async assertQueryDelayValue(expectedValue: string) {
      const actualQueryDelay = await testSubjects.getAttribute(
        'mlJobWizardInputQueryDelay',
        'value'
      );
      expect(actualQueryDelay).to.eql(expectedValue);
    },

    async setQueryDelay(queryDelay: string) {
      await testSubjects.setValue('mlJobWizardInputQueryDelay', queryDelay, {
        clearWithKeyboard: true,
      });
      await this.assertQueryDelayValue(queryDelay);
    },

    async assertFrequencyInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputFrequency');
    },

    async assertFrequencyValue(expectedValue: string) {
      const actualFrequency = await testSubjects.getAttribute('mlJobWizardInputFrequency', 'value');
      expect(actualFrequency).to.eql(expectedValue);
    },

    async setFrequency(frequency: string) {
      await testSubjects.setValue('mlJobWizardInputFrequency', frequency, {
        clearWithKeyboard: true,
      });
      await this.assertFrequencyValue(frequency);
    },

    async assertScrollSizeInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputScrollSize');
    },

    async assertScrollSizeValue(expectedValue: string) {
      const actualScrollSize = await testSubjects.getAttribute(
        'mlJobWizardInputScrollSize',
        'value'
      );
      expect(actualScrollSize).to.eql(expectedValue);
    },

    async setScrollSize(scrollSize: string) {
      await testSubjects.setValue('mlJobWizardInputScrollSize', scrollSize, {
        clearWithKeyboard: true,
      });
      await this.assertScrollSizeValue(scrollSize);
    },

    async assertTimeFieldInputExists() {
      await testSubjects.existOrFail('mlTimeFieldNameSelect > comboBoxInput');
    },

    async assertTimeFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlTimeFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectTimeField(identifier: string) {
      await comboBox.set('mlTimeFieldNameSelect > comboBoxInput', identifier);
      await this.assertTimeFieldSelection(identifier);
    },

    async assertCategorizationFieldInputExists() {
      await testSubjects.existOrFail('mlCategorizationFieldNameSelect > comboBoxInput');
    },

    async assertCategorizationFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCategorizationFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectCategorizationField(identifier: string) {
      await comboBox.set('mlCategorizationFieldNameSelect > comboBoxInput', identifier);
      await this.assertCategorizationFieldSelection(identifier);
    },

    async assertSummaryCountFieldInputExists() {
      await testSubjects.existOrFail('mlSummaryCountFieldNameSelect > comboBoxInput');
    },

    async assertSummaryCountFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlSummaryCountFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectSummaryCountField(identifier: string) {
      await comboBox.set('mlSummaryCountFieldNameSelect > comboBoxInput', identifier);
      await this.assertSummaryCountFieldSelection(identifier);
    },

    async assertAddDetectorButtonExists() {
      await testSubjects.existOrFail('mlAddDetectorButton');
    },

    async openCreateDetectorModal() {
      await testSubjects.click('mlAddDetectorButton');
      await this.assertCreateDetectorModalExists();
    },

    async assertCreateDetectorModalExists() {
      // this retry can be removed as soon as #48734 is merged
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('mlCreateDetectorModal');
      });
    },

    async assertDetectorFunctionInputExists() {
      await testSubjects.existOrFail('mlAdvancedFunctionSelect > comboBoxInput');
    },

    async assertDetectorFunctionSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedFunctionSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorFunction(identifier: string) {
      await comboBox.set('mlAdvancedFunctionSelect > comboBoxInput', identifier);
      await this.assertDetectorFunctionSelection(identifier);
    },

    async assertDetectorFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedFieldSelect > comboBoxInput');
    },

    async assertDetectorFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorField(identifier: string) {
      await comboBox.set('mlAdvancedFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorFieldSelection(identifier);
    },

    async assertDetectorByFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedByFieldSelect > comboBoxInput');
    },

    async assertDetectorByFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedByFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorByField(identifier: string) {
      await comboBox.set('mlAdvancedByFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorByFieldSelection(identifier);
    },

    async assertDetectorOverFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedOverFieldSelect > comboBoxInput');
    },

    async assertDetectorOverFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedOverFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorOverField(identifier: string) {
      await comboBox.set('mlAdvancedOverFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorOverFieldSelection(identifier);
    },

    async assertDetectorPartitionFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedPartitionFieldSelect > comboBoxInput');
    },

    async assertDetectorPartitionFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedPartitionFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorPartitionField(identifier: string) {
      await comboBox.set('mlAdvancedPartitionFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorPartitionFieldSelection(identifier);
    },

    async assertDetectorExcludeFrequentInputExists() {
      await testSubjects.existOrFail('mlAdvancedExcludeFrequentSelect > comboBoxInput');
    },

    async assertDetectorExcludeFrequentSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedExcludeFrequentSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async selectDetectorExcludeFrequent(identifier: string) {
      await comboBox.set('mlAdvancedExcludeFrequentSelect > comboBoxInput', identifier);
      await this.assertDetectorExcludeFrequentSelection(identifier);
    },

    async assertDetectorDescriptionInputExists() {
      await testSubjects.existOrFail('mlAdvancedDetectorDescriptionInput');
    },

    async assertDetectorDescriptionValue(expectedValue: string) {
      const actualDetectorDescription = await testSubjects.getAttribute(
        'mlAdvancedDetectorDescriptionInput',
        'value'
      );
      expect(actualDetectorDescription).to.eql(expectedValue);
    },

    async setDetectorDescription(description: string) {
      await testSubjects.setValue('mlAdvancedDetectorDescriptionInput', description, {
        clearWithKeyboard: true,
      });
      await this.assertDetectorDescriptionValue(description);
    },

    async confirmAddDetectorModal() {
      await testSubjects.clickWhenNotDisabled('mlCreateDetectorModalSaveButton');
      await testSubjects.missingOrFail('mlCreateDetectorModal');
    },

    async cancelAddDetectorModal() {
      await testSubjects.clickWhenNotDisabled('mlCreateDetectorModalCancelButton');
      await testSubjects.missingOrFail('mlCreateDetectorModal');
    },

    async assertDetectorEntryExists(detectorName: string, expectedDetectorDescription?: string) {
      await testSubjects.existOrFail(`mlAdvancedDetector ${detectorName}`);
      if (expectedDetectorDescription !== undefined) {
        await testSubjects.existOrFail(`mlAdvancedDetector ${detectorName} > detectorDescription`);
        const actualDetectorDescription = await testSubjects.getVisibleText(
          `mlAdvancedDetector ${detectorName} > detectorDescription`
        );
        expect(actualDetectorDescription).to.eql(expectedDetectorDescription);
      }
    },

    async clickEditDetector(detectorName: string) {
      await testSubjects.click(`mlAdvancedDetector ${detectorName} > mlAdvancedDetectorEditButton`);
      await this.assertCreateDetectorModalExists();
    },

    async createJob() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardButtonCreateJob');
      await testSubjects.existOrFail('mlStartDatafeedModal');
    },
  };
}
