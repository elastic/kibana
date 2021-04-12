/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformEditFlyoutProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertTransformEditFlyoutExists() {
      await testSubjects.existOrFail('transformEditFlyout');
    },

    async assertTransformEditFlyoutMissing() {
      await testSubjects.missingOrFail('transformEditFlyout');
    },

    async assertTransformEditFlyoutInputExists(input: string) {
      await testSubjects.existOrFail(`transformEditFlyout${input}Input`);
    },

    async assertTransformEditFlyoutInputValue(input: string, expectedValue: string) {
      const actualValue = await testSubjects.getAttribute(
        `transformEditFlyout${input}Input`,
        'value'
      );
      expect(actualValue).to.eql(
        expectedValue,
        `Transform edit flyout '${input}' input text should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    // for now we expect this to be used only for opening the accordion
    async openTransformEditAccordionAdvancedSettings() {
      await testSubjects.click('transformEditAccordionAdvancedSettings');
      await testSubjects.existOrFail('transformEditAccordionAdvancedSettingsContent');
    },

    async setTransformEditFlyoutInputValue(input: string, value: string) {
      await testSubjects.setValue(`transformEditFlyout${input}Input`, value, {
        clearWithKeyboard: true,
      });
      await this.assertTransformEditFlyoutInputValue(input, value);
    },

    async updateTransform() {
      await testSubjects.click('transformEditFlyoutUpdateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertTransformEditFlyoutMissing();
      });
    },
  };
}
