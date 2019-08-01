/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

export function MachineLearningJobWizardCommonProvider({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertTimeRangeSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleTimeRange');
    },

    async assertPickFieldsSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitlePickFields');
    },

    async assertJobDetailsSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleJobDetails');
    },

    async assertValidationSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleValidation');
    },

    async assertSummarySectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleSummary');
    },

    async assertEventRateChartExists() {
      await testSubjects.existOrFail('mlEventRateChart');
    },

    async assertAggAndFieldInputExists() {
      await testSubjects.existOrFail('mlJobWizardAggSelection comboBoxInput');
    },

    async assertAggAndFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardAggSelection comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async assertBucketSpanInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputBucketSpan');
    },

    async assertBucketSpanValue(expectedValue: string) {
      const actualBucketSpan = await testSubjects.getVisibleText('mlJobWizardInputBucketSpan');
      expect(actualBucketSpan).to.eql(expectedValue);
    },

    async assertJobIdInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputJobId');
    },

    async assertJobIdValue(expectedValue: string) {
      const actualJobId = await testSubjects.getVisibleText('mlJobWizardInputJobId');
      expect(actualJobId).to.eql(expectedValue);
    },

    async assertJobDescriptionInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputJobDescription');
    },

    async assertJobDescriptionValue(expectedValue: string) {
      const actualJobDescription = await testSubjects.getVisibleText(
        'mlJobWizardInputJobDescription'
      );
      expect(actualJobDescription).to.eql(expectedValue);
    },

    async assertJobGroupInputExists() {
      await testSubjects.existOrFail('mlJobWizardComboboxJobGroups comboBoxInput');
    },

    async assertJobGroupSelection(jobGroups: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardComboboxJobGroups comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(jobGroups.length);
      expect(comboBoxSelectedOptions).to.eql(jobGroups);
    },

    async assertAdvancedSectionExists() {
      await testSubjects.existOrFail('mlJobWizardAdvancedSection');
    },

    async assertModelPlotSwitchExists() {
      await testSubjects.existOrFail('mlJobWizardSwitchModelPlot');
    },

    async assertDedicatedIndexSwitchExists() {
      await testSubjects.existOrFail('mlJobWizardSwitchUseDedicatedIndex');
    },

    async assertDedicatedIndexSwitchCheckedState(expectedValue: boolean) {
      const actualJobDescription = this.getDedicatedIndexSwitchCheckedState();
      expect(actualJobDescription).to.eql(expectedValue);
    },

    async assertCreateJobButtonExists() {
      await testSubjects.existOrFail('mlJobWizardButtonCreateJob');
    },

    async getDedicatedIndexSwitchCheckedState() {
      return await testSubjects.getAttribute('mlJobWizardSwitchUseDedicatedIndex', 'checked');
    },

    async assertModelMemortyLimitInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputModelMemoryLimit');
    },

    async assertModelMemoryLimitValue(expectedValue: string) {
      const actualModelMemoryLimit = await testSubjects.getVisibleText(
        'mlJobWizardInputModelMemoryLimit'
      );
      expect(actualModelMemoryLimit).to.eql(expectedValue);
    },

    async clickNextButton() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardNavButtonNext');
    },

    async clickPreviousButton() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardNavButtonPrevious');
    },

    async clickUseFullDataButton() {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
    },

    async selectAggAndField(identifier: string) {
      await comboBox.set('mlJobWizardAggSelection comboBoxInput', identifier);
    },

    async setBucketSpan(bucketSpan: string) {
      await testSubjects.setValue('mlJobWizardInputBucketSpan', bucketSpan);
    },

    async setJobId(jobId: string) {
      await testSubjects.setValue('mlJobWizardInputJobId', jobId);
    },

    async setJobDescription(jobDescription: string) {
      await testSubjects.setValue('mlJobWizardInputJobDescription', jobDescription);
    },

    async addJobGroup(jobGroup: string) {
      await comboBox.setCustom('mlJobWizardComboboxJobGroups comboBoxInput', jobGroup);
    },

    async openAdvancedSection() {
      if ((await testSubjects.exists('mlJobWizardAdvancedSection')) === false) {
        await testSubjects.clickWhenNotDisabled('mlJobWizardToggleAdvancedSection');
      }
    },

    async activateDedicatedIndexSwitch() {
      if ((await this.getDedicatedIndexSwitchCheckedState()) === false) {
        await testSubjects.clickWhenNotDisabled('mlJobWizardSwitchUseDedicatedIndex');
      }
    },

    async setModelMemoryLimit(modelMemoryLimit: string) {
      await testSubjects.setValue('mlJobWizardInputModelMemoryLimit', modelMemoryLimit);
    },

    async createJobAndWaitForCompletion() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardButtonCreateJob');
      await retry.waitForWithTimeout(
        'job processing to finish',
        5 * 60 * 1000,
        async () => (await testSubjects.exists('mlJobWizardButtonCreateJob')) === false
      );
    },
  };
}
