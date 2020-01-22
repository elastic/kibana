/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataFrameAnalyticsCreationProvider({
  getService,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const browser = getService('browser');

  return {
    async assertJobTypeSelectExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutJobTypeSelect');
    },

    async assertJobTypeSelection(expectedSelection: string) {
      const actualSelection = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobFlyoutJobTypeSelect',
        'value'
      );
      expect(actualSelection).to.eql(
        expectedSelection,
        `Job type selection should be '${expectedSelection}' (got '${actualSelection}')`
      );
    },

    async selectJobType(jobType: string) {
      await testSubjects.selectValue('mlAnalyticsCreateJobFlyoutJobTypeSelect', jobType);
      await this.assertJobTypeSelection(jobType);
    },

    async assertAdvancedEditorSwitchExists() {
      await testSubjects.existOrFail(`mlAnalyticsCreateJobFlyoutAdvancedEditorSwitch`, {
        allowHidden: true,
      });
    },

    async assertAdvancedEditorSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState =
        (await testSubjects.getAttribute(
          'mlAnalyticsCreateJobFlyoutAdvancedEditorSwitch',
          'aria-checked'
        )) === 'true';
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Advanced editor switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async assertJobIdInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutJobIdInput');
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

    async setJobId(jobId: string) {
      await testSubjects.setValue('mlAnalyticsCreateJobFlyoutJobIdInput', jobId, {
        clearWithKeyboard: true,
      });
      await this.assertJobIdValue(jobId);
    },

    async assertSourceIndexInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutSourceIndexSelect > comboBoxInput');
    },

    async assertSourceIndexSelection(expectedSelection: string[]) {
      const actualSelection = await comboBox.getComboBoxSelectedOptions(
        'mlAnalyticsCreateJobFlyoutSourceIndexSelect > comboBoxInput'
      );
      expect(actualSelection).to.eql(
        expectedSelection,
        `Source index should be '${expectedSelection}' (got '${actualSelection}')`
      );
    },

    async selectSourceIndex(sourceIndex: string) {
      await comboBox.set(
        'mlAnalyticsCreateJobFlyoutSourceIndexSelect > comboBoxInput',
        sourceIndex
      );
      await this.assertSourceIndexSelection([sourceIndex]);
    },

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
      await testSubjects.setValue('mlAnalyticsCreateJobFlyoutDestinationIndexInput', destIndex, {
        clearWithKeyboard: true,
      });
      await this.assertDestIndexValue(destIndex);
    },

    async assertDependentVariableInputExists() {
      await testSubjects.existOrFail(
        'mlAnalyticsCreateJobFlyoutDependentVariableSelect > comboBoxInput'
      );
    },

    async assertDependentVariableInputMissing() {
      await testSubjects.missingOrFail(
        'mlAnalyticsCreateJobFlyoutDependentVariableSelect > comboBoxInput'
      );
    },

    async assertDependentVariableSelection(expectedSelection: string[]) {
      const actualSelection = await comboBox.getComboBoxSelectedOptions(
        'mlAnalyticsCreateJobFlyoutDependentVariableSelect > comboBoxInput'
      );
      expect(actualSelection).to.eql(
        expectedSelection,
        `Dependent variable should be '${expectedSelection}' (got '${actualSelection}')`
      );
    },

    async selectDependentVariable(dependentVariable: string) {
      await comboBox.set(
        'mlAnalyticsCreateJobFlyoutDependentVariableSelect > comboBoxInput',
        dependentVariable
      );
      await this.assertDependentVariableSelection([dependentVariable]);
    },

    async assertTrainingPercentInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutTrainingPercentSlider');
    },

    async assertTrainingPercentInputMissing() {
      await testSubjects.missingOrFail('mlAnalyticsCreateJobFlyoutTrainingPercentSlider');
    },

    async assertTrainingPercentValue(expectedValue: string) {
      const actualTrainingPercent = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobFlyoutTrainingPercentSlider',
        'value'
      );
      expect(actualTrainingPercent).to.eql(
        expectedValue,
        `Training percent should be '${expectedValue}' (got '${actualTrainingPercent}')`
      );
    },

    async setTrainingPercent(trainingPercent: string) {
      const slider = await testSubjects.find('mlAnalyticsCreateJobFlyoutTrainingPercentSlider');

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

    async assertModelMemoryInputExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutModelMemoryInput');
    },

    async assertModelMemoryValue(expectedValue: string) {
      const actualModelMemory = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobFlyoutModelMemoryInput',
        'value'
      );
      expect(actualModelMemory).to.eql(
        expectedValue,
        `Model memory limit should be '${expectedValue}' (got '${actualModelMemory}')`
      );
    },

    async setModelMemory(modelMemory: string) {
      await testSubjects.setValue('mlAnalyticsCreateJobFlyoutModelMemoryInput', modelMemory, {
        clearWithKeyboard: true,
      });
      await this.assertModelMemoryValue(modelMemory);
    },

    async assertCreateIndexPatternSwitchExists() {
      await testSubjects.existOrFail(`mlAnalyticsCreateJobFlyoutCreateIndexPatternSwitch`, {
        allowHidden: true,
      });
    },

    async getCreateIndexPatternSwitchCheckState(): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        'mlAnalyticsCreateJobFlyoutCreateIndexPatternSwitch',
        'aria-checked'
      );
      return state === 'true';
    },

    async assertCreateIndexPatternSwitchCheckState(expectedCheckState: boolean) {
      const actualCheckState = await this.getCreateIndexPatternSwitchCheckState();
      expect(actualCheckState).to.eql(
        expectedCheckState,
        `Create index pattern switch check state should be ${expectedCheckState} (got ${actualCheckState})`
      );
    },

    async setCreateIndexPatternSwitchState(checkState: boolean) {
      if ((await this.getCreateIndexPatternSwitchCheckState()) !== checkState) {
        await testSubjects.click('mlAnalyticsCreateJobFlyoutCreateIndexPatternSwitch');
      }
      await this.assertCreateIndexPatternSwitchCheckState(checkState);
    },

    async assertCreateButtonExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutCreateButton');
    },

    async assertCreateButtonMissing() {
      await testSubjects.missingOrFail('mlAnalyticsCreateJobFlyoutCreateButton');
    },

    async createAnalyticsJob() {
      await testSubjects.click('mlAnalyticsCreateJobFlyoutCreateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertCreateButtonMissing();
        await this.assertStartButtonExists();
      });
    },

    async assertStartButtonExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutStartButton');
    },

    async assertStartButtonMissing() {
      await testSubjects.missingOrFail('mlAnalyticsCreateJobFlyoutStartButton');
    },

    async startAnalyticsJob() {
      await testSubjects.click('mlAnalyticsCreateJobFlyoutStartButton');
      await retry.tryForTime(5000, async () => {
        await this.assertStartButtonMissing();
        await this.assertCloseButtonExists();
      });
    },

    async assertCloseButtonExists() {
      await testSubjects.existOrFail('mlAnalyticsCreateJobFlyoutCloseButton');
    },

    async closeCreateAnalyticsJobFlyout() {
      await testSubjects.click('mlAnalyticsCreateJobFlyoutCloseButton');
      await retry.tryForTime(5000, async () => {
        await testSubjects.missingOrFail('mlAnalyticsCreateJobFlyout');
      });
    },
  };
}
