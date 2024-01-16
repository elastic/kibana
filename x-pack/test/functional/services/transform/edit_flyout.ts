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
      await testSubjects.existOrFail('editTransformFlyout');
    },

    async assertTransformEditFlyoutMissing() {
      await testSubjects.missingOrFail('editTransformFlyout');
    },

    async assertTransformEditFlyoutInputExists(input: string) {
      await testSubjects.existOrFail(`editTransformFlyout${input}Input`);
    },

    async assertTransformEditFlyoutInputValue(input: string, expectedValue: string) {
      const actualValue = await testSubjects.getAttribute(
        `editTransformFlyout${input}Input`,
        'value'
      );
      expect(actualValue).to.eql(
        expectedValue,
        `Transform edit flyout '${input}' input text should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertTransformEditFlyoutIngestPipelineFieldSelectExists() {
      await testSubjects.existOrFail(`editTransformFlyoutDestinationIngestPipelineFieldSelect`);
    },

    async assertTransformEditFlyoutRetentionPolicySwitchEnabled(expectedValue: boolean) {
      await testSubjects.existOrFail(`transformRetentionPolicySwitch`, {
        timeout: 1000,
      });
      await retry.tryForTime(5000, async () => {
        const isEnabled = await testSubjects.isEnabled(`transformRetentionPolicySwitch`);
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected 'transformRetentionPolicySwitch' input to be '${
            expectedValue ? 'enabled' : 'disabled'
          }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
        );
      });
    },

    async assertTransformEditFlyoutRetentionPolicyFieldSelectEnabled(expectedValue: boolean) {
      await testSubjects.existOrFail(`editTransformFlyoutRetentionPolicyFieldSelect`, {
        timeout: 1000,
      });
      await retry.tryForTime(5000, async () => {
        const isEnabled = await testSubjects.isEnabled(
          `editTransformFlyoutRetentionPolicyFieldSelect`
        );
        expect(isEnabled).to.eql(
          expectedValue,
          `Expected 'editTransformFlyoutRetentionPolicyFieldSelect' input to be '${
            expectedValue ? 'enabled' : 'disabled'
          }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
        );
      });
    },

    async assertTransformEditFlyoutRetentionPolicyFieldSelectValue(expectedValue: string) {
      await testSubjects.existOrFail(`editTransformFlyoutRetentionPolicyFieldSelect`, {
        timeout: 1000,
      });
      const actualValue = await testSubjects.getAttribute(
        'editTransformFlyoutRetentionPolicyFieldSelect',
        'value'
      );
      expect(actualValue).to.eql(
        expectedValue,
        `Retention policy field option value should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async setTransformEditFlyoutRetentionPolicyFieldSelectValue(fieldOptionValue: string) {
      await testSubjects.selectValue(
        'editTransformFlyoutRetentionPolicyFieldSelect',
        fieldOptionValue
      );
      await this.assertTransformEditFlyoutRetentionPolicyFieldSelectValue(fieldOptionValue);
    },

    async assertTransformEditFlyoutInputEnabled(input: string, expectedValue: boolean) {
      await testSubjects.existOrFail(`editTransformFlyout${input}Input`, { timeout: 1000 });
      const isEnabled = await testSubjects.isEnabled(`editTransformFlyout${input}Input`);
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

    async openTransformEditAccordionAdvancedSettings() {
      await testSubjects.click('transformEditAccordionAdvancedSettings');
      await testSubjects.existOrFail('transformEditAccordionAdvancedSettingsContent');
    },

    async clickTransformEditRetentionPolicySettings(expectExists: boolean) {
      await testSubjects.click('transformRetentionPolicySwitch');
      if (expectExists) {
        await testSubjects.existOrFail('transformEditRetentionPolicyContent');
      } else {
        await testSubjects.missingOrFail('transformEditRetentionPolicyContent');
      }
    },

    async setTransformEditFlyoutInputValue(input: string, value: string) {
      await testSubjects.setValue(`editTransformFlyout${input}Input`, value, {
        clearWithKeyboard: true,
      });
      await this.assertTransformEditFlyoutInputValue(input, value);
    },

    async assertUpdateTransformButtonExists() {
      await testSubjects.existOrFail('editTransformFlyoutUpdateButton');
    },

    async assertUpdateTransformButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('editTransformFlyoutUpdateButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "Update" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async updateTransform() {
      await testSubjects.click('editTransformFlyoutUpdateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertTransformEditFlyoutMissing();
      });
    },
  };
}
