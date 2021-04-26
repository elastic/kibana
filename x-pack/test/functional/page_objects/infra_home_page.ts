/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import testSubjSelector from '@kbn/test-subj-selector';

import { FtrProviderContext } from '../ftr_provider_context';

export function InfraHomePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');

  return {
    async goToTime(time: string) {
      const datePickerInput = await find.byCssSelector(
        `${testSubjSelector('waffleDatePicker')} .euiDatePicker.euiFieldText`
      );
      await datePickerInput.clearValueWithKeyboard({ charByChar: true });
      await datePickerInput.type([time, browser.keys.RETURN]);
    },

    async getWaffleMap() {
      await retry.try(async () => {
        const element = await testSubjects.find('waffleMap');
        if (!element) {
          throw new Error();
        }
      });
      return await testSubjects.find('waffleMap');
    },

    async openInvenotrySwitcher() {
      await testSubjects.click('openInventorySwitcher');
      return await testSubjects.find('goToHost');
    },

    async goToHost() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      return await testSubjects.click('goToHost');
    },

    async goToPods() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      return await testSubjects.click('goToPods');
    },

    async goToDocker() {
      await testSubjects.click('openInventorySwitcher');
      await testSubjects.find('goToHost');
      return await testSubjects.click('goToDocker');
    },

    async goToSettings() {
      await testSubjects.click('infrastructureNavLink_/settings');
    },

    async goToInventory() {
      await testSubjects.click('infrastructureNavLink_/inventory');
    },

    async goToMetricExplorer() {
      return await testSubjects.click('infrastructureNavLink_/infrastructure/metrics-explorer');
    },

    async getSaveViewButton() {
      return await testSubjects.find('openSaveViewModal');
    },

    async getLoadViewsButton() {
      return await testSubjects.find('loadViews');
    },

    async openSaveViewsFlyout() {
      return await testSubjects.click('loadViews');
    },

    async closeSavedViewFlyout() {
      return await testSubjects.click('cancelSavedViewModal');
    },

    async openCreateSaveViewModal() {
      return await testSubjects.click('openSaveViewModal');
    },

    async openEnterViewNameAndSave() {
      await testSubjects.setValue('savedViewViweName', 'View1');
      await testSubjects.click('createSavedViewButton');
    },

    async getNoMetricsIndicesPrompt() {
      return await testSubjects.find('noMetricsIndicesPrompt');
    },

    async getNoMetricsDataPrompt() {
      return await testSubjects.find('noMetricsDataPrompt');
    },

    async openSourceConfigurationFlyout() {
      await testSubjects.click('configureSourceButton');
      await testSubjects.exists('sourceConfigurationFlyout');
    },

    async waitForLoading() {
      await testSubjects.missingOrFail('loadingMessage', { timeout: 20000 });
    },

    async openAnomalyFlyout() {
      await testSubjects.click('openAnomalyFlyoutButton');
      await testSubjects.exists('loadMLFlyout');
    },
    async closeFlyout() {
      await testSubjects.click('euiFlyoutCloseButton');
    },
    async goToAnomaliesTab() {
      await testSubjects.click('anomalyFlyoutAnomaliesTab');
    },
    async getNoAnomaliesMsg() {
      await testSubjects.find('noAnomaliesFoundMsg');
    },
    async clickHostsAnomaliesDropdown() {
      await testSubjects.click('anomaliesComboBoxType');
      await testSubjects.click('anomaliesHostComboBoxItem');
    },
    async clickK8sAnomaliesDropdown() {
      await testSubjects.click('anomaliesComboBoxType');
      await testSubjects.click('anomaliesK8sComboBoxItem');
    },
    async findAnomalies() {
      return testSubjects.findAll('anomalyRow');
    },
    async setAnomaliesDate(date: string) {
      await testSubjects.click('superDatePickerShowDatesButton');
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await testSubjects.click('superDatePickerAbsoluteTab');
      const datePickerInput = await testSubjects.find('superDatePickerAbsoluteDateInput');
      await datePickerInput.clearValueWithKeyboard();
      await datePickerInput.type([date]);
    },
    async setAnomaliesThreshold(threshold: string) {
      const thresholdInput = await find.byCssSelector(
        `.euiFieldNumber.euiRangeInput.euiRangeInput--max`
      );
      await thresholdInput.clearValueWithKeyboard({ charByChar: true });
      await thresholdInput.type([threshold]);
    },
  };
}
