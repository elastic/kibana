/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DataFrameAnalyticsConfig } from '@kbn/ml-plugin/public/application/data_frame_analytics/common';

import {
  isRegressionAnalysis,
  isClassificationAnalysis,
} from '@kbn/ml-plugin/common/util/analytics_utils';
import { FtrProviderContext } from '../../ftr_provider_context';
import type { CanvasElementColorStats } from '../canvas_element';
import type { MlCommonUI } from './common_ui';
import { MlApi } from './api';

export function MachineLearningDataFrameAnalyticsCreationProvider(
  { getPageObject, getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  mlApi: MlApi
) {
  const headerPage = getPageObject('header');
  const commonPage = getPageObject('common');

  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const aceEditor = getService('aceEditor');

  return {
    async assertJobTypeSelectExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardJobTypeSelect');
    },

    async scrollJobTypeSelectionIntoView() {
      await testSubjects.scrollIntoView('mlAnalyticsCreateJobWizardJobTypeSelect');
    },

    async assertJobTypeSelection(jobTypeAttribute: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`${jobTypeAttribute} selectedJobType`);
      });
    },

    async selectJobType(jobType: string) {
      const jobTypeAttribute = `mlAnalyticsCreation-${jobType}-option`;
      await testSubjects.click(jobTypeAttribute);
      await this.assertJobTypeSelection(jobTypeAttribute);
    },

    async assertAdvancedEditorSwitchExists() {
      await testSubjects.existOrFail(`mlAnalyticsCreateJobWizardAdvancedEditorSwitch`, {
        allowHidden: true,
      });
    },

    async assertAdvancedEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlAnalyticsCreateJobWizardAdvancedEditorSwitch',
          'aria-checked'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced editor switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertJobIdInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutJobIdInput');
    },

    async assertJobDescriptionInputExists() {
      await testSubjects.existOrFail('mlDFAnalyticsJobCreationJobDescription');
    },

    async assertJobIdValue(expectedValue: string) {
      const actualJobId = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobFlyoutJobIdInput',
        'value'
      );
      expect(actualJobId).to.eql(
        expectedValue,
        `Job id should be '${expectedValue}' (got '${actualJobId}')`
      );
    },

    async assertJobDescriptionValue(expectedValue: string) {
      const actualJobDescription = await testSubjects.getAttribute(
        'mlDFAnalyticsJobCreationJobDescription',
        'value'
      );
      expect(actualJobDescription).to.eql(
        expectedValue,
        `Job description should be '${expectedValue}' (got '${actualJobDescription}')`
      );
    },

    async setJobId(jobId: string) {
      await mlCommonUI.setValueWithChecks('mlAnalyticsCreateJobFlyoutJobIdInput', jobId, {
        clearWithKeyboard: true,
      });
      await this.assertJobIdValue(jobId);
    },

    async setJobDescription(jobDescription: string) {
      await mlCommonUI.setValueWithChecks(
        'mlDFAnalyticsJobCreationJobDescription',
        jobDescription,
        {
          clearWithKeyboard: true,
        }
      );
      await this.assertJobDescriptionValue(jobDescription);
    },

    async assertSourceDataPreviewExists() {
      await headerPage.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('mlAnalyticsCreationDataGrid loaded', { timeout: 5000 });
    },

    async assertIndexPreviewHistogramChartButtonExists() {
      await headerPage.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('mlAnalyticsCreationDataGridHistogramButton');
    },

    async enableSourceDataPreviewHistogramCharts(expectedDefaultButtonState: boolean) {
      await this.assertSourceDataPreviewHistogramChartButtonCheckState(expectedDefaultButtonState);
      if (expectedDefaultButtonState === false) {
        await testSubjects.click('mlAnalyticsCreationDataGridHistogramButton');
        await this.assertSourceDataPreviewHistogramChartButtonCheckState(true);
      }
    },

    async assertSourceDataPreviewHistogramChartButtonCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlAnalyticsCreationDataGridHistogramButton',
          'aria-pressed'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Chart histogram button check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertSourceDataPreviewHistogramCharts(
      expectedHistogramCharts: Array<{ chartAvailable: boolean; id: string; legend: string }>
    ) {
      // For each chart, get the content of each header cell and assert
      // the legend text and column id and if the chart should be present or not.
      await retry.tryForTime(10000, async () => {
        for (const expected of expectedHistogramCharts.values()) {
          const id = expected.id;
          await testSubjects.existOrFail(`mlDataGridChart-${id}`);

          if (expected.chartAvailable) {
            await testSubjects.existOrFail(`mlDataGridChart-${id}-histogram`);
          } else {
            await testSubjects.missingOrFail(`mlDataGridChart-${id}-histogram`);
          }

          const actualLegend = await testSubjects.getVisibleText(`mlDataGridChart-${id}-legend`);
          expect(actualLegend).to.eql(
            expected.legend,
            `Legend text for column '${id}' should be '${expected.legend}' (got '${actualLegend}')`
          );

          const actualId = await testSubjects.getVisibleText(`mlDataGridChart-${id}-id`);
          expect(actualId).to.eql(
            expected.id,
            `Id text for column '${id}' should be '${expected.id}' (got '${actualId}')`
          );
        }
      });
    },

    async assertIncludeFieldsSelectionExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardIncludesTable', { timeout: 8000 });

      await retry.tryForTime(8000, async () => {
        await testSubjects.existOrFail('mlAnalyticsCreateJobWizardIncludesSelect');
      });
    },

    async assertDestIndexInputExists() {
      await retry.tryForTime(4000, async () => {
        await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutDestinationIndexInput');
      });
    },

    async assertDestIndexValue(expectedValue: string) {
      const actualDestIndex = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobFlyoutDestinationIndexInput',
        'value'
      );
      expect(actualDestIndex).to.eql(
        expectedValue,
        `Destination index should be '${expectedValue}' (got '${actualDestIndex}')`
      );
    },

    async setDestIndex(destIndex: string) {
      await mlCommonUI.setValueWithChecks(
        'mlAnalyticsCreateJobFlyoutDestinationIndexInput',
        destIndex,
        {
          clearWithKeyboard: true,
        }
      );
      await this.assertDestIndexValue(destIndex);
    },

    async waitForDependentVariableInputLoaded() {
      await testSubjects.existOrFail('~mlAnalyticsCreateJobWizardDependentVariableSelect', {
        timeout: 5 * 1000,
      });
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardDependentVariableSelect loaded', {
        timeout: 30 * 1000,
      });
    },

    async assertDependentVariableInputExists() {
      await retry.tryForTime(8000, async () => {
        await testSubjects.existOrFail(
          '~mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput'
        );
      });
    },

    async assertDependentVariableInputMissing() {
      await testSubjects.missingOrFail(
        '~mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput'
      );
    },

    async assertRuntimeMappingSwitchExists() {
      await testSubjects.existOrFail('mlDataFrameAnalyticsRuntimeMappingsEditorSwitch');
    },

    async assertRuntimeMappingEditorExists() {
      await testSubjects.existOrFail('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor');
    },

    async assertRuntimeMappingsEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getRuntimeMappingsEditorSwitchCheckedState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced runtime mappings editor switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async getRuntimeMappingsEditorSwitchCheckedState(): Promise<boolean> {
      const subj = 'mlDataFrameAnalyticsRuntimeMappingsEditorSwitch';
      const isSelected = await testSubjects.getAttribute(subj, 'aria-checked');
      return isSelected === 'true';
    },

    async toggleRuntimeMappingsEditorSwitch(toggle: boolean) {
      const subj = 'mlDataFrameAnalyticsRuntimeMappingsEditorSwitch';
      if ((await this.getRuntimeMappingsEditorSwitchCheckedState()) !== toggle) {
        await retry.tryForTime(5 * 1000, async () => {
          await testSubjects.clickWhenNotDisabled(subj);
          await this.assertRuntimeMappingsEditorSwitchCheckState(toggle);
        });
      }
    },

    async setRuntimeMappingsEditorContent(input: string) {
      await aceEditor.setValue('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor', input);
    },

    async assertRuntimeMappingsEditorContent(expectedContent: string[]) {
      await this.assertRuntimeMappingEditorExists();

      const wrapper = await testSubjects.find('mlDataFrameAnalyticsAdvancedRuntimeMappingsEditor');
      const editor = await wrapper.findByCssSelector('.monaco-editor .view-lines');
      const runtimeMappingsEditorString = await editor.getVisibleText();
      // Not all lines may be visible in the editor and thus aceEditor may not return all lines.
      // This means we might not get back valid JSON so we only test against the first few lines
      // and see if the string matches.
      const splicedAdvancedEditorValue = runtimeMappingsEditorString.split('\n').splice(0, 3);
      expect(splicedAdvancedEditorValue).to.eql(
        expectedContent,
        `Expected the first editor lines to be '${expectedContent}' (got '${splicedAdvancedEditorValue}')`
      );
    },

    async applyRuntimeMappings() {
      const subj = 'mlDataFrameAnalyticsRuntimeMappingsApplyButton';
      await testSubjects.existOrFail(subj);
      await testSubjects.clickWhenNotDisabled(subj);
      const isEnabled = await testSubjects.isEnabled(subj);
      expect(isEnabled).to.eql(
        false,
        `Expected runtime mappings 'Apply changes' button to be disabled, got enabled.`
      );
    },

    async assertDependentVariableSelection(expectedSelection: string[]) {
      await this.waitForDependentVariableInputLoaded();
      const actualSelection = await comboBox.getComboBoxSelectedOptions(
        '~mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput'
      );
      expect(actualSelection).to.eql(
        expectedSelection,
        `Dependent variable should be '${expectedSelection}' (got '${actualSelection}')`
      );
    },

    async selectDependentVariable(dependentVariable: string) {
      await this.waitForDependentVariableInputLoaded();
      await comboBox.set(
        '~mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput',
        dependentVariable
      );
      await this.assertDependentVariableSelection([dependentVariable]);
    },

    async assertScatterplotMatrixLoaded() {
      await testSubjects.existOrFail(
        'mlAnalyticsCreateJobWizardScatterplotMatrixPanel > mlScatterplotMatrix loaded',
        {
          timeout: 5000,
        }
      );
    },

    async scrollScatterplotMatrixIntoView() {
      await testSubjects.scrollIntoView(
        'mlAnalyticsCreateJobWizardScatterplotMatrixPanel > mlScatterplotMatrix loaded'
      );
    },

    async assertScatterplotMatrix(expectedValue: CanvasElementColorStats) {
      await this.assertScatterplotMatrixLoaded();
      await this.scrollScatterplotMatrixIntoView();
      await mlCommonUI.assertColorsInCanvasElement(
        'mlAnalyticsCreateJobWizardScatterplotMatrixPanel',
        expectedValue,
        ['#000000']
      );
    },

    async setScatterplotMatrixSampleSizeSelectValue(selectValue: string) {
      await testSubjects.selectValue('mlScatterplotMatrixSampleSizeSelect', selectValue);

      const actualSelectState = await testSubjects.getAttribute(
        'mlScatterplotMatrixSampleSizeSelect',
        'value'
      );

      expect(actualSelectState).to.eql(
        selectValue,
        `Sample size should be '${selectValue}' (got '${actualSelectState}')`
      );
    },

    async getScatterplotMatrixRandomizeQuerySwitchCheckState(): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        'mlScatterplotMatrixRandomizeQuerySwitch',
        'aria-checked'
      );
      return state === 'true';
    },

    async assertScatterplotMatrixRandomizeQueryCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getScatterplotMatrixRandomizeQuerySwitchCheckState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Randomize query check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async setScatterplotMatrixRandomizeQueryCheckState(checkState: boolean) {
      await retry.tryForTime(30000, async () => {
        if ((await this.getScatterplotMatrixRandomizeQuerySwitchCheckState()) !== checkState) {
          await testSubjects.click('mlScatterplotMatrixRandomizeQuerySwitch');
        }
        await this.assertScatterplotMatrixRandomizeQueryCheckState(checkState);
      });
    },

    async assertTrainingPercentInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardTrainingPercentSlider');
    },

    async assertTrainingPercentInputMissing() {
      await testSubjects.missingOrFail('mlAnalyticsCreateJobWizardTrainingPercentSlider');
    },

    async assertTrainingPercentValue(expectedValue: string) {
      const actualTrainingPercent = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardTrainingPercentSlider',
        'value'
      );
      expect(actualTrainingPercent).to.eql(
        expectedValue,
        `Training percent should be '${expectedValue}' (got '${actualTrainingPercent}')`
      );
    },

    async setTrainingPercent(trainingPercent: number) {
      await mlCommonUI.setSliderValue(
        'mlAnalyticsCreateJobWizardTrainingPercentSlider',
        trainingPercent
      );
    },

    async assertConfigurationStepActive() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardConfigurationStep active', {
        timeout: 3000,
      });
    },

    async assertAdditionalOptionsStepActive() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardAdvancedStep active', {
        timeout: 3000,
      });
    },

    async assertDetailsStepActive() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardDetailsStep active', {
        timeout: 3000,
      });
    },

    async assertCreateStepActive() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardCreateStep active', {
        timeout: 3000,
      });
    },

    async assertValidationStepActive() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardValidationStepWrapper active', {
        timeout: 3000,
      });
    },

    async continueToAdditionalOptionsStep() {
      await retry.tryForTime(15 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled(
          'mlAnalyticsCreateJobWizardConfigurationStep active > mlAnalyticsCreateJobWizardContinueButton'
        );
        await this.assertAdditionalOptionsStepActive();
      });
    },

    async continueToDetailsStep() {
      await retry.tryForTime(15 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled(
          'mlAnalyticsCreateJobWizardAdvancedStep active > mlAnalyticsCreateJobWizardContinueButton'
        );
        await this.assertDetailsStepActive();
      });
    },

    async continueToValidationStep() {
      await retry.tryForTime(15 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled(
          'mlAnalyticsCreateJobWizardDetailsStep active > mlAnalyticsCreateJobWizardContinueButton'
        );
        await this.assertValidationStepActive();
      });
    },

    async assertValidationCalloutsExists() {
      await retry.tryForTime(4000, async () => {
        await testSubjects.existOrFail('mlValidationCallout');
      });
    },

    async assertAllValidationCalloutsPresent(expectedNumCallouts: number) {
      const validationCallouts = await testSubjects.findAll('mlValidationCallout');
      expect(validationCallouts.length).to.eql(expectedNumCallouts);
    },

    async continueToCreateStep() {
      await retry.tryForTime(15 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled(
          'mlAnalyticsCreateJobWizardValidationStepWrapper active > mlAnalyticsCreateJobWizardContinueButton'
        );
        await this.assertCreateStepActive();
      });
    },

    async assertModelMemoryInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardModelMemoryInput');
    },

    async assertModelMemoryValue(expectedValue: string) {
      const actualModelMemory = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardModelMemoryInput',
        'value'
      );
      expect(actualModelMemory).to.eql(
        expectedValue,
        `Model memory limit should be '${expectedValue}' (got '${actualModelMemory}')`
      );
    },

    async assertModelMemoryInputPopulated() {
      const actualModelMemory = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardModelMemoryInput',
        'value'
      );

      expect(actualModelMemory).not.to.be('');
    },

    async assertPredictionFieldNameValue(expectedValue: string) {
      const actualPredictedFieldName = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardPredictionFieldNameInput',
        'value'
      );
      expect(actualPredictedFieldName).to.eql(
        expectedValue,
        `Prediction field name should be '${expectedValue}' (got '${actualPredictedFieldName}')`
      );
    },

    async setModelMemory(modelMemory: string) {
      await retry.tryForTime(15 * 1000, async () => {
        await mlCommonUI.setValueWithChecks(
          'mlAnalyticsCreateJobWizardModelMemoryInput',
          modelMemory,
          {
            clearWithKeyboard: true,
          }
        );
        await this.assertModelMemoryValue(modelMemory);
      });
    },

    async assertCreateIndexPatternSwitchExists() {
      await testSubjects.existOrFail(`mlAnalyticsCreateJobWizardCreateIndexPatternCheckbox`, {
        allowHidden: true,
      });
    },

    async getCreateIndexPatternSwitchCheckState(): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardCreateIndexPatternCheckbox',
        'checked'
      );
      return state === 'true';
    },

    async assertCreateIndexPatternSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getCreateIndexPatternSwitchCheckState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Create data view switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async getDestIndexSameAsIdSwitchCheckState(): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardDestIndexSameAsIdSwitch',
        'aria-checked'
      );
      return state === 'true';
    },

    async assertDestIndexSameAsIdCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getDestIndexSameAsIdSwitchCheckState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Destination index same as job id check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async assertDestIndexSameAsIdSwitchExists() {
      await testSubjects.existOrFail(`mlAnalyticsCreateJobWizardDestIndexSameAsIdSwitch`, {
        allowHidden: true,
      });
    },

    async setDestIndexSameAsIdCheckState(checkState: boolean) {
      if ((await this.getDestIndexSameAsIdSwitchCheckState()) !== checkState) {
        await testSubjects.click('mlAnalyticsCreateJobWizardDestIndexSameAsIdSwitch');
      }
      await this.assertDestIndexSameAsIdCheckState(checkState);
    },

    async setCreateIndexPatternSwitchState(checkState: boolean) {
      if ((await this.getCreateIndexPatternSwitchCheckState()) !== checkState) {
        await testSubjects.click('mlAnalyticsCreateJobWizardCreateIndexPatternCheckbox');
      }
      await this.assertCreateIndexPatternSwitchCheckState(checkState);
    },

    async assertStartJobCheckboxExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardStartJobCheckbox');
    },

    async assertStartJobCheckboxCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlAnalyticsCreateJobWizardStartJobCheckbox',
          'checked'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Start job check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertCreateButtonExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardCreateButton');
    },

    async isCreateButtonDisabled() {
      const isEnabled = await testSubjects.isEnabled('mlAnalyticsCreateJobWizardCreateButton');
      return !isEnabled;
    },

    async createAnalyticsJob(analyticsId: string) {
      await testSubjects.click('mlAnalyticsCreateJobWizardCreateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertBackToManagementCardExists();
      });
      await mlApi.waitForDataFrameAnalyticsJobToExist(analyticsId);
    },

    async assertBackToManagementCardExists() {
      await testSubjects.existOrFail('analyticsWizardCardManagement');
    },

    async getHeaderText() {
      return await testSubjects.getVisibleText('mlDataFrameAnalyticsWizardHeaderTitle');
    },

    async assertInitialCloneJobConfigStep(job: DataFrameAnalyticsConfig) {
      const jobType = Object.keys(job.analysis)[0];
      const jobTypeAttribute = `mlAnalyticsCreation-${jobType}-option`;
      await this.assertJobTypeSelection(jobTypeAttribute);
      if (isClassificationAnalysis(job.analysis) || isRegressionAnalysis(job.analysis)) {
        await this.assertDependentVariableSelection([job.analysis[jobType].dependent_variable]);
        await this.assertTrainingPercentValue(String(job.analysis[jobType].training_percent));
      }
      await this.assertSourceDataPreviewExists();
      await this.assertIncludeFieldsSelectionExists();
      // await this.assertIncludedFieldsSelection(job.analyzed_fields.includes);
    },

    async assertInitialCloneJobAdditionalOptionsStep(
      analysis: DataFrameAnalyticsConfig['analysis']
    ) {
      const jobType = Object.keys(analysis)[0];
      if (isClassificationAnalysis(analysis) || isRegressionAnalysis(analysis)) {
        // @ts-ignore
        await this.assertPredictionFieldNameValue(analysis[jobType].prediction_field_name);
      }
    },

    async assertInitialCloneJobDetailsStep(job: DataFrameAnalyticsConfig) {
      await this.assertJobIdValue(''); // id should be empty
      await this.assertJobDescriptionValue(String(job.description));
      await this.assertDestIndexValue(''); // destination index should be empty
    },

    async assertCreationCalloutMessagesExist() {
      await testSubjects.existOrFail('analyticsWizardCreationCallout_0');
      await testSubjects.existOrFail('analyticsWizardCreationCallout_1');
      await testSubjects.existOrFail('analyticsWizardCreationCallout_2');
    },

    async navigateToJobManagementPage() {
      await retry.tryForTime(5000, async () => {
        await this.assertCreationCalloutMessagesExist();
      });
      await testSubjects.click('analyticsWizardCardManagement');
      await testSubjects.existOrFail('mlPageDataFrameAnalytics');
    },

    async assertQueryBarValue(expectedValue: string) {
      const actualQuery = await testSubjects.getAttribute('mlDFAnalyticsQueryInput', 'value');
      expect(actualQuery).to.eql(
        expectedValue,
        `Query should be '${expectedValue}' (got '${actualQuery}')`
      );
    },

    async setQueryBarValue(query: string) {
      await mlCommonUI.setValueWithChecks('mlDFAnalyticsQueryInput', query, {
        clearWithKeyboard: true,
      });
      await commonPage.pressEnterKey();
      await this.assertQueryBarValue(query);
    },
  };
}
