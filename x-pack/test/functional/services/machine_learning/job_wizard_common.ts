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

  return {
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

    async advanceToPickFieldsSection() {
      await this.clickNextButton();
      await this.assertPickFieldsSectionExists();
    },

    async advanceToJobDetailsSection() {
      await this.clickNextButton();
      await this.assertJobDetailsSectionExists();
    },

    async advanceToValidationSection() {
      await this.clickNextButton();
      await this.assertValidationSectionExists();
    },

    async advanceToSummarySection() {
      await this.clickNextButton();
      await this.assertSummarySectionExists();
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

    async assertAggAndFieldSelection(expectedIdentifier: string) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardAggSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions.length).to.eql(1);
      expect(comboBoxSelectedOptions[0]).to.eql(expectedIdentifier);
    },

    async selectAggAndField(identifier: string, isIdentifierKeptInField: boolean) {
      await comboBox.set('mlJobWizardAggSelection > comboBoxInput', identifier);
      await this.assertAggAndFieldSelection(isIdentifierKeptInField ? identifier : '');
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

    async setBucketSpan(bucketSpan: string) {
      await testSubjects.setValue('mlJobWizardInputBucketSpan', bucketSpan);
      await this.assertBucketSpanValue(bucketSpan);
    },

    async assertJobIdInputExists() {
      await testSubjects.existOrFail('mlJobWizardInputJobId');
    },

    async assertJobIdValue(expectedValue: string) {
      const actualJobId = await testSubjects.getAttribute('mlJobWizardInputJobId', 'value');
      expect(actualJobId).to.eql(expectedValue);
    },

    async setJobId(jobId: string) {
      await testSubjects.setValue('mlJobWizardInputJobId', jobId);
      await this.assertJobIdValue(jobId);
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

    async setJobDescription(jobDescription: string) {
      await testSubjects.setValue('mlJobWizardInputJobDescription', jobDescription);
      await this.assertJobDescriptionValue(jobDescription);
    },

    async assertJobGroupInputExists() {
      await testSubjects.existOrFail('mlJobWizardComboBoxJobGroups > comboBoxInput');
    },

    async getSelectedJobGroups(): Promise<string[]> {
      return await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardComboBoxJobGroups > comboBoxInput'
      );
    },

    async assertJobGroupSelection(jobGroups: string[]) {
      expect(await this.getSelectedJobGroups()).to.eql(jobGroups);
    },

    async addJobGroup(jobGroup: string) {
      await comboBox.setCustom('mlJobWizardComboBoxJobGroups > comboBoxInput', jobGroup);
      expect(await this.getSelectedJobGroups()).to.contain(jobGroup);
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

    async getDedicatedIndexSwitchCheckedState(): Promise<boolean> {
      await this.ensureAdvancedSectionOpen();
      return await testSubjects.isSelected(
        'mlJobWizardAdvancedSection > mlJobWizardSwitchUseDedicatedIndex'
      );
    },

    async assertDedicatedIndexSwitchCheckedState(expectedValue: boolean) {
      await this.ensureAdvancedSectionOpen();
      const actualCheckedState = await this.getDedicatedIndexSwitchCheckedState();
      expect(actualCheckedState).to.eql(expectedValue);
    },

    async activateDedicatedIndexSwitch() {
      if ((await this.getDedicatedIndexSwitchCheckedState()) === false) {
        await testSubjects.clickWhenNotDisabled('mlJobWizardSwitchUseDedicatedIndex');
      }
      await this.assertDedicatedIndexSwitchCheckedState(true);
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

    async setModelMemoryLimit(modelMemoryLimit: string) {
      await testSubjects.setValue('mlJobWizardInputModelMemoryLimit', modelMemoryLimit);
      await this.assertModelMemoryLimitValue(modelMemoryLimit);
    },

    async assertInfluencerInputExists() {
      await testSubjects.existOrFail('influencerSelect > comboBoxInput');
    },

    async getSelectedInfluencers(): Promise<string[]> {
      return await comboBox.getComboBoxSelectedOptions('influencerSelect > comboBoxInput');
    },

    async assertInfluencerSelection(influencers: string[]) {
      expect(await this.getSelectedInfluencers()).to.eql(influencers);
    },

    async addInfluencer(influencer: string) {
      await comboBox.setCustom('influencerSelect > comboBoxInput', influencer);
      expect(await this.getSelectedInfluencers()).to.contain(influencer);
    },

    async assertAnomalyChartExists(chartType: string, preSelector?: string) {
      let chartSelector = `mlAnomalyChart ${chartType}`;
      chartSelector = !preSelector ? chartSelector : `${preSelector} > ${chartSelector}`;
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

    async assertCreateJobButtonExists() {
      await testSubjects.existOrFail('mlJobWizardButtonCreateJob');
    },

    async assertDateRangeSelectionExists() {
      await testSubjects.existOrFail('jobWizardDateRange');
    },

    async getSelectedDateRange() {
      const dateRange = await testSubjects.find('jobWizardDateRange');
      const [startPicker, endPicker] = await dateRange.findAllByClassName('euiFieldText');
      return {
        startDate: await startPicker.getAttribute('value'),
        endDate: await endPicker.getAttribute('value'),
      };
    },

    async assertDateRangeSelection(expectedStartDate: string, expectedEndDate: string) {
      expect(await this.getSelectedDateRange()).to.eql({
        startDate: expectedStartDate,
        endDate: expectedEndDate,
      });
    },

    async clickUseFullDataButton(expectedStartDate: string, expectedEndDate: string) {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
      await this.assertDateRangeSelection(expectedStartDate, expectedEndDate);
    },

    async ensureAdvancedSectionOpen() {
      await retry.try(async () => {
        if ((await testSubjects.exists('mlJobWizardAdvancedSection')) === false) {
          await testSubjects.click('mlJobWizardToggleAdvancedSection');
          await testSubjects.existOrFail('mlJobWizardAdvancedSection');
        }
      });
    },

    async createJobAndWaitForCompletion() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardButtonCreateJob');
      await retry.waitForWithTimeout(
        'job processing to finish',
        5 * 60 * 1000,
        async () => await testSubjects.exists('mlJobWizardButtonRunInRealtime')
      );
    },
  };
}
