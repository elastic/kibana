/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobWizardAdvancedProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const aceEditor = getService('aceEditor');

  return {
    async getValueOrPlaceholder(inputLocator: string): Promise<string> {
      const value = await testSubjects.getAttribute(inputLocator, 'value');
      if (value !== '') {
        return value;
      } else {
        return await testSubjects.getAttribute(inputLocator, 'placeholder');
      }
    },

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
      const actualQueryDelay = await this.getValueOrPlaceholder('mlJobWizardInputQueryDelay');
      expect(actualQueryDelay).to.eql(expectedValue);
    },

    async setQueryDelay(queryDelay: string) {
      await testSubjects.setValue('mlJobWizardInputQueryDelay', queryDelay, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await this.assertQueryDelayValue(queryDelay);
    },

    async assertFrequencyInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputFrequency');
    },

    async assertFrequencyValue(expectedValue: string) {
      const actualFrequency = await this.getValueOrPlaceholder('mlJobWizardInputFrequency');
      expect(actualFrequency).to.eql(expectedValue);
    },

    async setFrequency(frequency: string) {
      await testSubjects.setValue('mlJobWizardInputFrequency', frequency, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await this.assertFrequencyValue(frequency);
    },

    async assertScrollSizeInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputScrollSize');
    },

    async assertScrollSizeValue(expectedValue: string) {
      const actualScrollSize = await this.getValueOrPlaceholder('mlJobWizardInputScrollSize');
      expect(actualScrollSize).to.eql(expectedValue);
    },

    async setScrollSize(scrollSize: string) {
      await testSubjects.setValue('mlJobWizardInputScrollSize', scrollSize, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
      await this.assertScrollSizeValue(scrollSize);
    },

    async assertTimeFieldInputExists() {
      await testSubjects.existOrFail('mlTimeFieldNameSelect > comboBoxInput');
    },

    async assertTimeFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlTimeFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectTimeField(identifier: string) {
      await comboBox.set('mlTimeFieldNameSelect > comboBoxInput', identifier);
      await this.assertTimeFieldSelection([identifier]);
    },

    async assertCategorizationFieldInputExists() {
      await testSubjects.existOrFail('mlCategorizationFieldNameSelect > comboBoxInput');
    },

    async assertCategorizationFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlCategorizationFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectCategorizationField(identifier: string) {
      await comboBox.set('mlCategorizationFieldNameSelect > comboBoxInput', identifier);
      await this.assertCategorizationFieldSelection([identifier]);
    },

    async assertSummaryCountFieldInputExists() {
      await testSubjects.existOrFail('mlSummaryCountFieldNameSelect > comboBoxInput');
    },

    async assertSummaryCountFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlSummaryCountFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectSummaryCountField(identifier: string) {
      await comboBox.set('mlSummaryCountFieldNameSelect > comboBoxInput', identifier);
      await this.assertSummaryCountFieldSelection([identifier]);
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

    async assertDetectorFunctionSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedFunctionSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectDetectorFunction(identifier: string) {
      await comboBox.set('mlAdvancedFunctionSelect > comboBoxInput', identifier);
      await this.assertDetectorFunctionSelection([identifier]);
    },

    async assertDetectorFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedFieldSelect > comboBoxInput');
    },

    async assertDetectorFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectDetectorField(identifier: string) {
      await comboBox.set('mlAdvancedFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorFieldSelection([identifier]);
    },

    async assertDetectorByFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedByFieldSelect > comboBoxInput');
    },

    async assertDetectorByFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedByFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectDetectorByField(identifier: string) {
      await comboBox.set('mlAdvancedByFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorByFieldSelection([identifier]);
    },

    async assertDetectorOverFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedOverFieldSelect > comboBoxInput');
    },

    async assertDetectorOverFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedOverFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectDetectorOverField(identifier: string) {
      await comboBox.set('mlAdvancedOverFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorOverFieldSelection([identifier]);
    },

    async assertDetectorPartitionFieldInputExists() {
      await testSubjects.existOrFail('mlAdvancedPartitionFieldSelect > comboBoxInput');
    },

    async assertDetectorPartitionFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedPartitionFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectDetectorPartitionField(identifier: string) {
      await comboBox.set('mlAdvancedPartitionFieldSelect > comboBoxInput', identifier);
      await this.assertDetectorPartitionFieldSelection([identifier]);
    },

    async assertDetectorExcludeFrequentInputExists() {
      await testSubjects.existOrFail('mlAdvancedExcludeFrequentSelect > comboBoxInput');
    },

    async assertDetectorExcludeFrequentSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedExcludeFrequentSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectDetectorExcludeFrequent(identifier: string) {
      await comboBox.set('mlAdvancedExcludeFrequentSelect > comboBoxInput', identifier);
      await this.assertDetectorExcludeFrequentSelection([identifier]);
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

    async assertDetectorEntryExists(
      detectorIndex: number,
      expectedDetectorName: string,
      expectedDetectorDescription?: string
    ) {
      await testSubjects.existOrFail(`mlAdvancedDetector ${detectorIndex}`);

      const actualDetectorIdentifier = await testSubjects.getVisibleText(
        `mlAdvancedDetector ${detectorIndex} > mlDetectorIdentifier`
      );
      expect(actualDetectorIdentifier).to.eql(expectedDetectorName);

      if (expectedDetectorDescription !== undefined) {
        const actualDetectorDescription = await testSubjects.getVisibleText(
          `mlAdvancedDetector ${detectorIndex} > mlDetectorDescription`
        );
        expect(actualDetectorDescription).to.eql(expectedDetectorDescription);
      }
    },

    async clickEditDetector(detectorIndex: number) {
      await testSubjects.click(
        `mlAdvancedDetector ${detectorIndex} > mlAdvancedDetectorEditButton`
      );
      await this.assertCreateDetectorModalExists();
    },

    async createJob() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardButtonCreateJob');
      // this retry can be removed as soon as #48734 is merged
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('mlStartDatafeedModal');
      });
    },
  };
}
