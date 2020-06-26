/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { DataFrameAnalyticsConfig } from '../../../../plugins/ml/public/application/data_frame_analytics/common';
import {
  ClassificationAnalysis,
  RegressionAnalysis,
} from '../../../../plugins/ml/public/application/data_frame_analytics/common/analytics';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommon } from './common';
import { MlApi } from './api';

enum ANALYSIS_CONFIG_TYPE {
  OUTLIER_DETECTION = 'outlier_detection',
  REGRESSION = 'regression',
  CLASSIFICATION = 'classification',
}

const isRegressionAnalysis = (arg: any): arg is RegressionAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION;
};

const isClassificationAnalysis = (arg: any): arg is ClassificationAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;
};

export function MachineLearningDataFrameAnalyticsCreationProvider(
  { getService }: FtrProviderContext,
  mlCommon: MlCommon,
  mlApi: MlApi
) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const browser = getService('browser');

  return {
    async assertJobTypeSelectExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardJobTypeSelect');
    },

    async assertJobTypeSelection(expectedSelection: string) {
      const actualSelection = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardJobTypeSelect',
        'value'
      );
      expect(actualSelection).to.eql(
        expectedSelection,
        `Job type selection should be '${expectedSelection}' (got '${actualSelection}')`
      );
    },

    async selectJobType(jobType: string) {
      await testSubjects.click('mlAnalyticsCreateJobWizardJobTypeSelect');
      await testSubjects.click(`mlAnalyticsCreation-${jobType}-option`);
      await this.assertJobTypeSelection(jobType);
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
      await mlCommon.setValueWithChecks('mlAnalyticsCreateJobFlyoutJobIdInput', jobId, {
        clearWithKeyboard: true,
      });
      await this.assertJobIdValue(jobId);
    },

    async setJobDescription(jobDescription: string) {
      await mlCommon.setValueWithChecks('mlDFAnalyticsJobCreationJobDescription', jobDescription, {
        clearWithKeyboard: true,
      });
      await this.assertJobDescriptionValue(jobDescription);
    },

    // async assertExcludedFieldsSelection(expectedSelection: string[]) {
    //   const actualSelection = await comboBox.getComboBoxSelectedOptions(
    //     'mlAnalyticsCreateJobWizardExcludesSelect'
    //   );
    //   expect(actualSelection).to.eql(
    //     expectedSelection,
    //     `Excluded fields should be '${expectedSelection}' (got '${actualSelection}')`
    //   );
    // },

    async assertDestIndexInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutDestinationIndexInput');
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
      await mlCommon.setValueWithChecks(
        'mlAnalyticsCreateJobFlyoutDestinationIndexInput',
        destIndex,
        {
          clearWithKeyboard: true,
        }
      );
      await this.assertDestIndexValue(destIndex);
    },

    async assertDependentVariableInputExists() {
      await retry.tryForTime(8000, async () => {
        await testSubjects.existOrFail(
          'mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput'
        );
      });
    },

    async assertDependentVariableInputMissing() {
      await testSubjects.missingOrFail(
        'mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput'
      );
    },

    async assertDependentVariableSelection(expectedSelection: string[]) {
      const actualSelection = await comboBox.getComboBoxSelectedOptions(
        'mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput'
      );
      expect(actualSelection).to.eql(
        expectedSelection,
        `Dependent variable should be '${expectedSelection}' (got '${actualSelection}')`
      );
    },

    async selectDependentVariable(dependentVariable: string) {
      await comboBox.set(
        'mlAnalyticsCreateJobWizardDependentVariableSelect > comboBoxInput',
        dependentVariable
      );
      await this.assertDependentVariableSelection([dependentVariable]);
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

    async setTrainingPercent(trainingPercent: string) {
      const slider = await testSubjects.find('mlAnalyticsCreateJobWizardTrainingPercentSlider');

      let currentValue = await slider.getAttribute('value');
      let currentDiff = +currentValue - +trainingPercent;

      await retry.tryForTime(60 * 1000, async () => {
        if (currentDiff === 0) {
          return true;
        } else {
          if (currentDiff > 0) {
            if (Math.abs(currentDiff) >= 10) {
              slider.type(browser.keys.PAGE_DOWN);
            } else {
              slider.type(browser.keys.ARROW_LEFT);
            }
          } else {
            if (Math.abs(currentDiff) >= 10) {
              slider.type(browser.keys.PAGE_UP);
            } else {
              slider.type(browser.keys.ARROW_RIGHT);
            }
          }
          await retry.tryForTime(1000, async () => {
            const newValue = await slider.getAttribute('value');
            if (newValue !== currentValue) {
              currentValue = newValue;
              currentDiff = +currentValue - +trainingPercent;
              return true;
            } else {
              throw new Error(`slider value should have changed, but is still ${currentValue}`);
            }
          });

          throw new Error(`slider value should be '${trainingPercent}' (got '${currentValue}')`);
        }
      });

      await this.assertTrainingPercentValue(trainingPercent);
    },

    async continueToAdditionalOptionsStep() {
      await testSubjects.click('mlAnalyticsCreateJobWizardContinueButton');
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardAdvancedStep');
    },

    async continueToDetailsStep() {
      await testSubjects.click('mlAnalyticsCreateJobWizardContinueButton');
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardDetailsStep');
    },

    async continueToCreateStep() {
      await testSubjects.click('mlAnalyticsCreateJobWizardContinueButton');
      await testSubjects.existOrFail('mlAnalyticsCreateJobWizardCreateStep');
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

    async setModelMemory(modelMemory: string) {
      await retry.tryForTime(15 * 1000, async () => {
        await mlCommon.setValueWithChecks(
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
      await testSubjects.existOrFail(`mlAnalyticsCreateJobWizardCreateIndexPatternSwitch`, {
        allowHidden: true,
      });
    },

    async getCreateIndexPatternSwitchCheckState(): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobWizardCreateIndexPatternSwitch',
        'aria-checked'
      );
      return state === 'true';
    },

    async assertCreateIndexPatternSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getCreateIndexPatternSwitchCheckState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Create index pattern switch check state should be '${expectedCheckState}' (got '${actualCheckState}')`
      );
    },

    async setCreateIndexPatternSwitchState(checkState: boolean) {
      if ((await this.getCreateIndexPatternSwitchCheckState()) !== checkState) {
        await testSubjects.click('mlAnalyticsCreateJobWizardCreateIndexPatternSwitch');
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
      await this.assertJobTypeSelection(jobType);
      if (isClassificationAnalysis(job.analysis) || isRegressionAnalysis(job.analysis)) {
        await this.assertDependentVariableSelection([job.analysis[jobType].dependent_variable]);
        await this.assertTrainingPercentValue(String(job.analysis[jobType].training_percent));
      }
      // await this.assertExcludedFieldsSelection(job.analyzed_fields.excludes);
    },

    async assertInitialCloneJobAdditionalOptionsStep(job: DataFrameAnalyticsConfig) {
      await this.assertModelMemoryValue(job.model_memory_limit);
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
  };
}
