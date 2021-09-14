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

    async assertTransformEditFlyoutRetentionPolicySelectEnabled(expectedValue: boolean) {
      await testSubjects.existOrFail(`transformEditFlyoutRetentionPolicyFieldSelect`, {
        timeout: 1000,
      });
      const isEnabled = await testSubjects.isEnabled(
        `transformEditFlyoutRetentionPolicyFieldSelect`
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected 'transformEditFlyoutRetentionPolicyFieldSelect' input to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async assertTransformEditFlyoutInputEnabled(input: string, expectedValue: boolean) {
      await testSubjects.existOrFail(`transformEditFlyout${input}Input`, { timeout: 1000 });
      const isEnabled = await testSubjects.isEnabled(`transformEditFlyout${input}Input`);
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected '${input}' input to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    // for now we expect these to be used only for opening the accordion
    async openTransformEditAccordionDestinationSettings() {
      await testSubjects.click('transformEditAccordionDestination');
      await testSubjects.existOrFail('transformEditAccordionDestinationContent');
    },

    async openTransformEditAccordionRetentionPolicySettings() {
      await testSubjects.click('transformEditAccordionRetentionPolicy');
      await testSubjects.existOrFail('transformEditAccordionRetentionPolicyContent');
    },

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

    async assertUpdateTransformButtonExists() {
      await testSubjects.existOrFail('transformEditFlyoutUpdateButton');
    },

    async assertUpdateTransformButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('transformEditFlyoutUpdateButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Update" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async updateTransform() {
      await testSubjects.click('transformEditFlyoutUpdateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertTransformEditFlyoutMissing();
      });
    },
  };
}
