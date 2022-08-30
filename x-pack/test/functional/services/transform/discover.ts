/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformDiscoverProvider({ getService }: FtrProviderContext) {
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  return {
    async assertDiscoverQueryHits(expectedDiscoverQueryHits: string) {
      await testSubjects.existOrFail('discoverQueryHits');

      const actualDiscoverQueryHits = await testSubjects.getVisibleText('discoverQueryHits');

      expect(actualDiscoverQueryHits).to.eql(
        expectedDiscoverQueryHits,
        `Discover query hits should be ${expectedDiscoverQueryHits}, got ${actualDiscoverQueryHits}`
      );
    },

    async assertNoResults(expectedDestinationIndex: string) {
      // Discover should use the destination index pattern
      const actualIndexPatternSwitchLinkText = await (
        await testSubjects.find('discover-dataView-switch-link')
      ).getVisibleText();
      expect(actualIndexPatternSwitchLinkText).to.eql(
        expectedDestinationIndex,
        `Destination index should be ${expectedDestinationIndex}, got ${actualIndexPatternSwitchLinkText}`
      );

      await testSubjects.existOrFail('discoverNoResults');
    },

    async assertSuperDatePickerToggleQuickMenuButtonExists() {
      await testSubjects.existOrFail('superDatePickerToggleQuickMenuButton');
    },

    async openSuperDatePicker() {
      await testSubjects.click('superDatePickerToggleQuickMenuButton');
      await testSubjects.existOrFail('superDatePickerQuickMenu');
    },

    async quickSelectYears() {
      const quickMenuElement = await testSubjects.find('superDatePickerQuickMenu');

      // No test subject, select "Years" to look back 15 years instead of 15 minutes.
      await find.selectValue(`[aria-label*="Time unit"]`, 'y');

      // Apply
      const applyButton = await quickMenuElement.findByClassName('euiQuickSelect__applyButton');
      const actualApplyButtonText = await applyButton.getVisibleText();
      expect(actualApplyButtonText).to.be('Apply');

      await applyButton.click();
      await testSubjects.existOrFail('discoverQueryHits');
    },
  };
}
