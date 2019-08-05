/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import testSubjSelector from '@kbn/test-subj-selector';

import { FtrProviderContext } from '../ftr_provider_context';

export function InfraHomePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  return {
    async goToTime(time: string) {
      const datePickerInput = await find.byCssSelector(
        `${testSubjSelector('waffleDatePicker')} .euiDatePicker.euiFieldText`
      );
      await datePickerInput.type(Array(30).fill(browser.keys.BACK_SPACE));
      await datePickerInput.type([time, browser.keys.RETURN]);
    },

    async getWaffleMap() {
      return await testSubjects.find('waffleMap');
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
  };
}
