/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformDatePickerProvider({ getService, getPageObjects }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['timePicker']);

  return {
    async assertSuperDatePickerToggleQuickMenuButtonExists() {
      await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
    },

    async openSuperDatePicker() {
      await testSubjects.click('superDatePickerToggleQuickMenuButton');
      await testSubjects.existOrFail('superDatePickerQuickMenu');
    },

    async quickSelect(timeValue: number = 15, timeUnit: string = 'y') {
      const quickMenuElement = await testSubjects.find('superDatePickerQuickMenu');

      // No test subject, defaults to select `"Years"` to look back 15 years instead of 15 minutes.
      await find.selectValue(`[aria-label*="Time value"]`, timeValue.toString());
      await find.selectValue(`[aria-label*="Time unit"]`, timeUnit);

      // Apply
      const applyButton = await quickMenuElement.findByClassName('euiQuickSelect__applyButton');
      const actualApplyButtonText = await applyButton.getVisibleText();
      expect(actualApplyButtonText).to.be('Apply');

      await applyButton.click();
    },

    async setTimeRange(fromTime: string, toTime: string) {
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    },
  };
}
