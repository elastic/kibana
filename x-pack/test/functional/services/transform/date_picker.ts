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
  const pageObjects = getPageObjects(['timePicker']);
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertSuperDatePickerToggleQuickMenuButtonExists() {
      await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
    },

    async openSuperDatePicker() {
      await this.assertSuperDatePickerToggleQuickMenuButtonExists();
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.click('superDatePickerToggleQuickMenuButton');
        await testSubjects.existOrFail('superDatePickerQuickMenu');
      });
    },

    async quickSelect(timeValue: number = 15, timeUnit: string = 'y') {
      await this.openSuperDatePicker();
      const quickMenuElement = await testSubjects.find('superDatePickerQuickMenu');

      // No test subject, defaults to select `"Years"` to look back 15 years instead of 15 minutes.
      await find.selectValue(`[aria-label*="Time value"]`, timeValue.toString());
      await find.selectValue(`[aria-label*="Time unit"]`, timeUnit);

      // Apply
      const applyButton = await quickMenuElement.findByTestSubject(
        'superDatePickerQuickSelectApplyButton'
      );
      const actualApplyButtonText = await applyButton.getVisibleText();
      expect(actualApplyButtonText).to.be('Apply');

      await applyButton.click();
      await testSubjects.missingOrFail('superDatePickerQuickMenu');
    },

    async setTimeRange(fromTime: string, toTime: string) {
      await pageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
    },

    async assertUseFullDataButtonVisible(shouldBeVisible: boolean) {
      const selector = 'mlDatePickerButtonUseFullData';
      if (shouldBeVisible === true) {
        await testSubjects.existOrFail(selector);
      } else {
        await testSubjects.missingOrFail(selector);
      }
    },
    async assertDatePickerDataTierOptionsVisible(shouldBeVisible: boolean) {
      const selector = 'mlDatePickerButtonDataTierOptions';
      if (shouldBeVisible === true) {
        await testSubjects.existOrFail(selector);
      } else {
        await testSubjects.missingOrFail(selector);
      }
    },

    async clickUseFullDataButton(expectedTimeConfig: { start: string; end: string }) {
      await testSubjects.existOrFail('mlDatePickerButtonUseFullData');
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlDatePickerButtonUseFullData');

      await retry.try(async () => {
        const start = await testSubjects.getVisibleText('superDatePickerstartDatePopoverButton');
        const end = await testSubjects.getVisibleText('superDatePickerendDatePopoverButton');
        const actualTimeConfig = { start, end };

        expect(actualTimeConfig).to.eql(
          expectedTimeConfig,
          `Transform time config should be '${JSON.stringify(
            expectedTimeConfig
          )}' (got '${JSON.stringify(actualTimeConfig)}')`
        );
      });
    },
  };
}
