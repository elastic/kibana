/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommon } from './common';
import { MlCustomUrls } from './custom_urls';

export function MachineLearningJobWizardCommonProvider(
  { getService }: FtrProviderContext,
  mlCommon: MlCommon,
  customUrls: MlCustomUrls
) {
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  interface SectionOptions {
    withAdvancedSection: boolean;
  }

  function advancedSectionSelector(subSelector?: string) {
    const subj = 'mlJobWizardAdvancedSection';
    return !subSelector ? subj : `${subj} > ${subSelector}`;
  }

  return {
    async clickNextButton() {
      await testSubjects.existOrFail('mlJobWizardNavButtonNext');
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

    async assertConfigureDatafeedSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleConfigureDatafeed');
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

    async assertAggAndFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardAggSelection > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(expectedIdentifier);
    },

    async selectAggAndField(identifier: string, isIdentifierKeptInField: boolean) {
      await comboBox.set('mlJobWizardAggSelection > comboBoxInput', identifier);
      await this.assertAggAndFieldSelection(isIdentifierKeptInField ? [identifier] : []);
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
      await mlCommon.setValueWithChecks('mlJobWizardInputBucketSpan', bucketSpan, {
        clearWithKeyboard: true,
        typeCharByChar: true,
      });
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
      await mlCommon.setValueWithChecks('mlJobWizardInputJobId', jobId, {
        clearWithKeyboard: true,
      });
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
      await mlCommon.setValueWithChecks('mlJobWizardInputJobDescription', jobDescription, {
        clearWithKeyboard: true,
      });
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

    async getSelectedCalendars(): Promise<string[]> {
      await this.ensureAdditionalSettingsSectionOpen();
      return await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardComboBoxCalendars > comboBoxInput'
      );
    },

    async assertCalendarsSelection(calendars: string[]) {
      expect(await this.getSelectedCalendars()).to.eql(calendars);
    },

    async addCalendar(calendarId: string) {
      await this.ensureAdditionalSettingsSectionOpen();
      await comboBox.setCustom('mlJobWizardComboBoxCalendars > comboBoxInput', calendarId);
      expect(await this.getSelectedCalendars()).to.contain(calendarId);
    },

    async assertModelPlotSwitchExists(
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      let subj = 'mlJobWizardSwitchModelPlot';
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      await testSubjects.existOrFail(subj, { allowHidden: true });
    },

    async getModelPlotSwitchCheckedState(
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ): Promise<boolean> {
      let subj = 'mlJobWizardSwitchModelPlot';
      const isSelected = await testSubjects.getAttribute(subj, 'aria-checked');
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      return isSelected === 'true';
    },

    async assertModelPlotSwitchCheckedState(
      expectedValue: boolean,
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      const actualCheckedState = await this.getModelPlotSwitchCheckedState({
        withAdvancedSection: sectionOptions.withAdvancedSection,
      });
      expect(actualCheckedState).to.eql(expectedValue);
    },

    async assertModelPlotSwitchEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlJobWizardSwitchModelPlot');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected model plot switch to be '${expectedValue ? 'enabled' : 'disabled'}' (got ${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertDedicatedIndexSwitchExists(
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      let subj = 'mlJobWizardSwitchUseDedicatedIndex';
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      await testSubjects.existOrFail(subj, { allowHidden: true });
    },

    async getDedicatedIndexSwitchCheckedState(
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ): Promise<boolean> {
      let subj = 'mlJobWizardSwitchUseDedicatedIndex';
      const isSelected = await testSubjects.getAttribute(subj, 'aria-checked');
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      return isSelected === 'true';
    },

    async assertDedicatedIndexSwitchCheckedState(
      expectedValue: boolean,
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      const actualCheckedState = await this.getDedicatedIndexSwitchCheckedState({
        withAdvancedSection: sectionOptions.withAdvancedSection,
      });
      expect(actualCheckedState).to.eql(expectedValue);
    },

    async activateDedicatedIndexSwitch(
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      let subj = 'mlJobWizardSwitchUseDedicatedIndex';
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      if (
        (await this.getDedicatedIndexSwitchCheckedState({
          withAdvancedSection: sectionOptions.withAdvancedSection,
        })) === false
      ) {
        await testSubjects.clickWhenNotDisabled(subj);
      }
      await this.assertDedicatedIndexSwitchCheckedState(true, {
        withAdvancedSection: sectionOptions.withAdvancedSection,
      });
    },

    async assertModelMemoryLimitInputExists(
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      let subj = 'mlJobWizardInputModelMemoryLimit';
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      await testSubjects.existOrFail(subj);
    },

    async assertModelMemoryLimitValue(
      expectedValue: string,
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      let subj = 'mlJobWizardInputModelMemoryLimit';
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      const actualModelMemoryLimit = await testSubjects.getAttribute(subj, 'value');
      expect(actualModelMemoryLimit).to.eql(expectedValue);
    },

    async setModelMemoryLimit(
      modelMemoryLimit: string,
      sectionOptions: SectionOptions = { withAdvancedSection: true }
    ) {
      let subj = 'mlJobWizardInputModelMemoryLimit';
      if (sectionOptions.withAdvancedSection === true) {
        await this.ensureAdvancedSectionOpen();
        subj = advancedSectionSelector(subj);
      }
      await mlCommon.setValueWithChecks(subj, modelMemoryLimit, { clearWithKeyboard: true });
      await this.assertModelMemoryLimitValue(modelMemoryLimit, {
        withAdvancedSection: sectionOptions.withAdvancedSection,
      });
    },

    async assertInfluencerInputExists() {
      await testSubjects.existOrFail('mlInfluencerSelect > comboBoxInput');
    },

    async getSelectedInfluencers(): Promise<string[]> {
      return await comboBox.getComboBoxSelectedOptions('mlInfluencerSelect > comboBoxInput');
    },

    async assertInfluencerSelection(influencers: string[]) {
      expect(await this.getSelectedInfluencers()).to.eql(influencers);
    },

    async addInfluencer(influencer: string) {
      await comboBox.set('mlInfluencerSelect > comboBoxInput', influencer);
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
      await testSubjects.existOrFail(`mlDetector ${detectorPosition}`);
      await testSubjects.existOrFail(`mlDetector ${detectorPosition} > mlDetectorTitle`);
      expect(
        await testSubjects.getVisibleText(`mlDetector ${detectorPosition} > mlDetectorTitle`)
      ).to.eql(aggAndFieldIdentifier);

      await this.assertAnomalyChartExists(chartType, `mlDetector ${detectorPosition}`);
    },

    async assertCreateJobButtonExists() {
      await testSubjects.existOrFail('mlJobWizardButtonCreateJob');
    },

    async assertDateRangeSelectionExists() {
      await testSubjects.existOrFail('mlJobWizardDateRange');
    },

    async getSelectedDateRange() {
      const dateRange = await testSubjects.find('mlJobWizardDateRange');
      const [startPicker, endPicker] = await dateRange.findAllByClassName('euiFieldText');
      return {
        startDate: await startPicker.getAttribute('value'),
        endDate: await endPicker.getAttribute('value'),
      };
    },

    async assertDateRangeSelection(expectedStartDate: string, expectedEndDate: string) {
      await retry.tryForTime(5000, async () => {
        expect(await this.getSelectedDateRange()).to.eql({
          startDate: expectedStartDate,
          endDate: expectedEndDate,
        });
      });
    },

    async clickUseFullDataButton(expectedStartDate: string, expectedEndDate: string) {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
      await this.assertDateRangeSelection(expectedStartDate, expectedEndDate);
    },

    async ensureAdditionalSettingsSectionOpen() {
      await retry.tryForTime(5000, async () => {
        if ((await testSubjects.exists('mlJobWizardAdditionalSettingsSection')) === false) {
          await testSubjects.click('mlJobWizardToggleAdditionalSettingsSection');
          await testSubjects.existOrFail('mlJobWizardAdditionalSettingsSection', { timeout: 1000 });
        }
      });
    },

    async ensureNewCustomUrlFormModalOpen() {
      await retry.tryForTime(5000, async () => {
        if ((await testSubjects.exists('mlJobNewCustomUrlFormModal')) === false) {
          await testSubjects.click('mlJobOpenCustomUrlFormButton');
          await testSubjects.existOrFail('mlJobNewCustomUrlFormModal', { timeout: 1000 });
        }
      });
    },

    async addCustomUrl(customUrl: { label: string }) {
      await this.ensureAdditionalSettingsSectionOpen();

      const existingCustomUrls = await testSubjects.findAll('mlJobEditCustomUrlsList > *');

      await this.ensureNewCustomUrlFormModalOpen();
      // Fill-in the form
      await customUrls.setCustomUrlLabel(customUrl.label);
      // Save custom URL
      await customUrls.saveCustomUrl('mlJobNewCustomUrlFormModal');

      const expectedIndex = existingCustomUrls.length;

      await customUrls.assertCustomUrlItem(expectedIndex, customUrl.label);
    },

    async ensureAdvancedSectionOpen() {
      await retry.tryForTime(5000, async () => {
        if ((await testSubjects.exists(advancedSectionSelector())) === false) {
          await testSubjects.click('mlJobWizardToggleAdvancedSection');
          await testSubjects.existOrFail(advancedSectionSelector(), { timeout: 1000 });
        }
      });
    },

    async createJobAndWaitForCompletion() {
      await testSubjects.clickWhenNotDisabled('mlJobWizardButtonCreateJob');
      await testSubjects.existOrFail('mlJobWizardButtonRunInRealTime', { timeout: 2 * 60 * 1000 });
    },
  };
}
