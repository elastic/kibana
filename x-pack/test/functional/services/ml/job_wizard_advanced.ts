/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningJobWizardAdvancedProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
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
      expect(actualValue).to.eql(
        expectedValue,
        `Expected datafeed query editor value to be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertQueryDelayInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputQueryDelay');
    },

    async assertQueryDelayValue(expectedValue: string) {
      const actualQueryDelay = await this.getValueOrPlaceholder('mlJobWizardInputQueryDelay');
      expect(actualQueryDelay).to.eql(
        expectedValue,
        `Expected query delay value to be '${expectedValue}' (got '${actualQueryDelay}')`
      );
    },

    async setQueryDelay(queryDelay: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputQueryDelay', queryDelay, {
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
      expect(actualFrequency).to.eql(
        expectedValue,
        `Expected frequency value to be '${expectedValue}' (got '${actualFrequency}')`
      );
    },

    async setFrequency(frequency: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputFrequency', frequency, {
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
      expect(actualScrollSize).to.eql(
        expectedValue,
        `Expected scroll size value to be '${expectedValue}' (got '${actualScrollSize}')`
      );
    },

    async setScrollSize(scrollSize: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputScrollSize', scrollSize, {
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected time field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected categorization field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected summary count field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectSummaryCountField(identifier: string) {
      await comboBox.set('mlSummaryCountFieldNameSelect > comboBoxInput', identifier);
      await this.assertSummaryCountFieldSelection([identifier]);
    },

    async assertAddDetectorButtonExists() {
      await testSubjects.existOrFail('mlAddDetectorButton');
    },

    async openCreateDetectorModal() {
      await retry.tryForTime(20 * 1000, async () => {
        await testSubjects.click('mlAddDetectorButton');
        await this.assertCreateDetectorModalExists();
      });
    },

    async assertCreateDetectorModalExists() {
      await testSubjects.existOrFail('mlCreateDetectorModal', { timeout: 5000 });
    },

    async assertDetectorFunctionInputExists() {
      await testSubjects.existOrFail('mlAdvancedFunctionSelect > comboBoxInput');
    },

    async assertDetectorFunctionSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlAdvancedFunctionSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector function selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector by field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector over field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector partition field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected detector exclude frequent selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(actualDetectorDescription).to.eql(
        expectedValue,
        `Expected detector description value to be '${expectedValue}' (got '${actualDetectorDescription}')`
      );
    },

    async setDetectorDescription(description: string) {
      await mlCommonUI.setValueWithChecks('mlAdvancedDetectorDescriptionInput', description, {
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
      expect(actualDetectorIdentifier).to.eql(
        expectedDetectorName,
        `Expected detector name to be '${expectedDetectorName}' (got '${actualDetectorIdentifier}')`
      );

      if (expectedDetectorDescription !== undefined) {
        const actualDetectorDescription = await testSubjects.getVisibleText(
          `mlAdvancedDetector ${detectorIndex} > mlDetectorDescription`
        );
        expect(actualDetectorDescription).to.eql(
          expectedDetectorDescription,
          `Expected detector description to be '${expectedDetectorDescription}' (got '${actualDetectorDescription}')`
        );
      }
    },

    async clickEditDetector(detectorIndex: number) {
      await retry.tryForTime(20 * 1000, async () => {
        await testSubjects.click(
          `mlAdvancedDetector ${detectorIndex} > mlAdvancedDetectorEditButton`
        );
        await this.assertCreateDetectorModalExists();
      });
    },

    async createJob() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardButtonCreateJob');
      await testSubjects.existOrFail('mlStartDatafeedModal', { timeout: 10 * 1000 });
    },
  };
}
