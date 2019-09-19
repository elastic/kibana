/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobWizardCommonProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const log = getService('log');

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
      await testSubjects.existOrFail('~mlEventRateChart');
    },

    async assertEventRateChartHasData() {
      await testSubjects.existOrFail('mlEventRateChart withData');
    },

    async assertAggAndFieldInputExists() {
      await testSubjects.existOrFail('mlJobWizardAggSelection > comboBoxInput');
    },

    async assertAggAndFieldSelection(identifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardAggSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(identifier);
    },

    async assertBucketSpanInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputBucketSpan');
    },

    async assertBucketSpanValue(expectedValue: string) {
      const actualBucketSpan = await testSubjects.getAttribute(
        'mlJobWizardInputBucketSpan',
        'value'
      );
      expect(actualBucketSpan).to.eql(expectedValue);
    },

    async assertJobIdInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputJobId');
    },

    async assertJobIdValue(expectedValue: string) {
      const actualJobId = await testSubjects.getAttribute('mlJobWizardInputJobId', 'value');
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
      await testSubjects.existOrFail('mlJobWizardComboBoxJobGroups > comboBoxInput');
    },

    async assertJobGroupSelection(jobGroups: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardComboBoxJobGroups > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(jobGroups);
    },

    async assertModelPlotSwitchExists() {
      await this.ensureAdvancedSectionOpen();
      await testSubjects.existOrFail('mlJobWizardAdvancedSection > mlJobWizardSwitchModelPlot', {
        allowHidden: true,
      });
    },

    async assertDedicatedIndexSwitchExists() {
      await this.ensureAdvancedSectionOpen();
      await testSubjects.existOrFail(
        'mlJobWizardAdvancedSection > mlJobWizardSwitchUseDedicatedIndex',
        { allowHidden: true }
      );
    },

    async assertDedicatedIndexSwitchCheckedState(expectedValue: boolean) {
      await this.ensureAdvancedSectionOpen();
      const actualCheckedState = await this.getDedicatedIndexSwitchCheckedState();
      expect(actualCheckedState).to.eql(expectedValue);
    },

    async assertCreateJobButtonExists() {
      await testSubjects.existOrFail('mlJobWizardButtonCreateJob');
    },

    async getDedicatedIndexSwitchCheckedState() {
      await this.ensureAdvancedSectionOpen();
      return await testSubjects.isSelected(
        'mlJobWizardAdvancedSection > mlJobWizardSwitchUseDedicatedIndex'
      );
    },

    async assertModelMemoryLimitInputExists() {
      await this.ensureAdvancedSectionOpen();
      await testSubjects.existOrFail(
        'mlJobWizardAdvancedSection > mlJobWizardInputModelMemoryLimit'
      );
    },

    async assertModelMemoryLimitValue(expectedValue: string) {
      await this.ensureAdvancedSectionOpen();
      const actualModelMemoryLimit = await testSubjects.getAttribute(
        'mlJobWizardAdvancedSection > mlJobWizardInputModelMemoryLimit',
        'value'
      );
      expect(actualModelMemoryLimit).to.eql(expectedValue);
    },

    async assertInfluencerInputExists() {
      await testSubjects.existOrFail('influencerSelect > comboBoxInput');
    },

    async assertInfluencerSelection(influencers: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'influencerSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(influencers);
    },

    async assertAnomalyChartExists(chartType: string, preSelector?: string) {
      let chartSelector = `mlAnomalyChart ${chartType}`;
      chartSelector = !preSelector ? chartSelector : `${preSelector} > ${chartSelector}`;
      log.debug('chartSelector: ' + chartSelector);
    },

    async assertDetectorPreviewExists(
      aggAndFieldIdentifier: string,
      detectorPosition: number,
      chartType: string
    ) {
      await testSubjects.existOrFail(`detector ${detectorPosition}`);
      await testSubjects.existOrFail(`detector ${detectorPosition} > detectorTitle`);
      expect(
        await testSubjects.getVisibleText(`detector ${detectorPosition} > detectorTitle`)
      ).to.eql(aggAndFieldIdentifier);

      await this.assertAnomalyChartExists(chartType, `detector ${detectorPosition}`);
    },

    async assertDetectorSplitExists(splitField: string) {
      await testSubjects.existOrFail(`dataSplit > dataSplitTitle ${splitField}`);
      await testSubjects.existOrFail(`dataSplit > splitCard front`);
      await testSubjects.existOrFail(`dataSplit > splitCard back`);
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

    async waitForNextButtonVisible() {
      await retry.waitFor(
        'next button to be visible',
        async () => await testSubjects.isDisplayed('mlJobWizardNavButtonNext')
      );
    },

    async clickNextButton() {
      await this.waitForNextButtonVisible();
      await testSubjects.clickWhenNotDisabled('mlJobWizardNavButtonNext');
    },

    async clickPreviousButton() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardNavButtonPrevious');
    },

    async clickUseFullDataButton() {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
    },

    async selectAggAndField(identifier: string) {
      await comboBox.set('mlJobWizardAggSelection > comboBoxInput', identifier);
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
      await comboBox.setCustom('mlJobWizardComboBoxJobGroups > comboBoxInput', jobGroup);
    },

    async addInfluencer(influencer: string) {
      await comboBox.setCustom('influencerSelect > comboBoxInput', influencer);
    },

    async ensureAdvancedSectionOpen() {
      await retry.try(async () => {
        if ((await testSubjects.exists('mlJobWizardAdvancedSection')) === false) {
          await testSubjects.click('mlJobWizardToggleAdvancedSection');
          await testSubjects.existOrFail('mlJobWizardAdvancedSection');
        }
      });
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
