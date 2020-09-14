/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';
import { MlCustomUrls } from './custom_urls';

export function MachineLearningJobWizardCommonProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
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
      await testSubjects.existOrFail('mlJobWizardStepTitleTimeRange', { timeout: 5000 });
    },

    async assertPickFieldsSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitlePickFields', { timeout: 5000 });
    },

    async assertJobDetailsSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleJobDetails', { timeout: 5000 });
    },

    async assertValidationSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleValidation', { timeout: 5000 });
    },

    async assertSummarySectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleSummary', { timeout: 5000 });
    },

    async assertConfigureDatafeedSectionExists() {
      await testSubjects.existOrFail('mlJobWizardStepTitleConfigureDatafeed');
    },

    async advanceToPickFieldsSection() {
      await retry.tryForTime(15 * 1000, async () => {
        await this.clickNextButton();
        await this.assertPickFieldsSectionExists();
      });
    },

    async advanceToJobDetailsSection() {
      await retry.tryForTime(15 * 1000, async () => {
        await this.clickNextButton();
        await this.assertJobDetailsSectionExists();
      });
    },

    async advanceToValidationSection() {
      await retry.tryForTime(15 * 1000, async () => {
        await this.clickNextButton();
        await this.assertValidationSectionExists();
      });
    },

    async advanceToSummarySection() {
      await retry.tryForTime(15 * 1000, async () => {
        await this.clickNextButton();
        await this.assertSummarySectionExists();
      });
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
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected agg and field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
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
      expect(actualBucketSpan).to.eql(
        expectedValue,
        `Expected bucket span value to be '${expectedValue}' (got '${actualBucketSpan}')`
      );
    },

    async setBucketSpan(bucketSpan: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputBucketSpan', bucketSpan, {
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
      expect(actualJobId).to.eql(
        expectedValue,
        `Expected job id value to be '${expectedValue}' (got '${actualJobId}')`
      );
    },

    async setJobId(jobId: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputJobId', jobId, {
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
      expect(actualJobDescription).to.eql(
        expectedValue,
        `Expected job description value to be '${expectedValue}' (got '${actualJobDescription}')`
      );
    },

    async setJobDescription(jobDescription: string) {
      await mlCommonUI.setValueWithChecks('mlJobWizardInputJobDescription', jobDescription, {
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
      const actualJobGroupSelection = await this.getSelectedJobGroups();
      expect(actualJobGroupSelection).to.eql(
        jobGroups,
        `Expected job group selection to be '${jobGroups}' (got '${actualJobGroupSelection}')`
      );
    },

    async addJobGroup(jobGroup: string) {
      await comboBox.setCustom('mlJobWizardComboBoxJobGroups > comboBoxInput', jobGroup);
      const actualJobGroupSelection = await this.getSelectedJobGroups();
      expect(actualJobGroupSelection).to.contain(
        jobGroup,
        `Expected job group selection to contain '${jobGroup}' (got '${actualJobGroupSelection}')`
      );
    },

    async getSelectedCalendars(): Promise<string[]> {
      await this.ensureAdditionalSettingsSectionOpen();
      return await comboBox.getComboBoxSelectedOptions(
        'mlJobWizardComboBoxCalendars > comboBoxInput'
      );
    },

    async assertCalendarsSelection(calendars: string[]) {
      const actualCalendarSelection = await this.getSelectedCalendars();
      expect(actualCalendarSelection).to.eql(
        calendars,
        `Expected calendar selection to be '${calendars}' (got '${actualCalendarSelection}')`
      );
    },

    async addCalendar(calendarId: string) {
      await this.ensureAdditionalSettingsSectionOpen();
      await comboBox.set('mlJobWizardComboBoxCalendars > comboBoxInput', calendarId);
      const actualCalendarSelection = await this.getSelectedCalendars();
      expect(actualCalendarSelection).to.contain(
        calendarId,
        `Expected calendar selection to contain '${calendarId}' (got '${actualCalendarSelection}')`
      );
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
      expect(actualCheckedState).to.eql(
        expectedValue,
        `Expected model plot switch to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          actualCheckedState ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertModelPlotSwitchEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlJobWizardSwitchModelPlot');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected model plot switch to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
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
      expect(actualCheckedState).to.eql(
        expectedValue,
        `Expected dedicated index switch to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          actualCheckedState ? 'enabled' : 'disabled'
        }')`
      );
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
        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.clickWhenNotDisabled(subj);
          await this.assertDedicatedIndexSwitchCheckedState(true, {
            withAdvancedSection: sectionOptions.withAdvancedSection,
          });
        });
      }
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
      expect(actualModelMemoryLimit).to.eql(
        expectedValue,
        `Expected model memory limit value to be '${expectedValue}' (got '${actualModelMemoryLimit}')`
      );
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
      await retry.tryForTime(15 * 1000, async () => {
        await mlCommonUI.setValueWithChecks(subj, modelMemoryLimit, { clearWithKeyboard: true });
        await this.assertModelMemoryLimitValue(modelMemoryLimit, {
          withAdvancedSection: sectionOptions.withAdvancedSection,
        });
      });
    },

    async assertInfluencerInputExists() {
      await testSubjects.existOrFail('mlInfluencerSelect > comboBoxInput');
    },

    async getSelectedInfluencers(): Promise<string[]> {
      return await comboBox.getComboBoxSelectedOptions('mlInfluencerSelect > comboBoxInput');
    },

    async assertInfluencerSelection(influencers: string[]) {
      const actualInfluencerSelection = await this.getSelectedInfluencers();
      expect(actualInfluencerSelection).to.eql(
        influencers,
        `Expected influencer selection to be '${influencers}' (got '${actualInfluencerSelection}')`
      );
    },

    async addInfluencer(influencer: string) {
      await comboBox.set('mlInfluencerSelect > comboBoxInput', influencer);
      const actualInfluencerSelection = await this.getSelectedInfluencers();
      expect(actualInfluencerSelection).to.contain(
        influencer,
        `Expected influencer selection to contain '${influencer}' (got '${actualInfluencerSelection}')`
      );
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
      const actualDetectorTitle = await testSubjects.getVisibleText(
        `mlDetector ${detectorPosition} > mlDetectorTitle`
      );
      expect(actualDetectorTitle).to.eql(
        aggAndFieldIdentifier,
        `Expected detector title at position '${detectorPosition}' to be '${aggAndFieldIdentifier}' (got '${actualDetectorTitle}')`
      );

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
        const { startDate, endDate } = await this.getSelectedDateRange();
        expect(startDate).to.eql(
          expectedStartDate,
          `Expected start date to be '${expectedStartDate}' (got '${startDate}')`
        );
        expect(endDate).to.eql(
          expectedEndDate,
          `Expected end date to be '${expectedEndDate}' (got '${endDate}')`
        );
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
