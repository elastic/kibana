/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformEditFlyoutProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertTransfromEditFlyoutExists() {
      await testSubjects.existOrFail('transformEditFlyout');
    },

    async assertTransfromEditFlyoutMissing() {
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
        `Transform ${input} input text should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async assertTransformExpandedRowMessages(expectedText: string) {
      await testSubjects.click('transformListRowDetailsToggle');

      // The expanded row should show the details tab content by default
      await testSubjects.existOrFail('transformDetailsTab');
      await testSubjects.existOrFail('~transformDetailsTabContent');

      // Click on the messages tab and assert the messages
      await testSubjects.existOrFail('transformMessagesTab');
      await testSubjects.click('transformMessagesTab');
      await testSubjects.existOrFail('~transformMessagesTabContent');
      const actualText = await testSubjects.getVisibleText('~transformMessagesTabContent');
      expect(actualText.includes(expectedText)).to.eql(
        true,
        `Transform messages text should include '${expectedText}'`
      );
    },

    async setTransformEditFlyoutInputValue(input: string, value: string) {
      await testSubjects.setValue(`transformEditFlyout${input}Input`, value, {
        clearWithKeyboard: true,
      });
      await this.assertTransformEditFlyoutInputValue(input, value);
    },

    async openTransformEditFlyout() {
      await testSubjects.click('transformActionEdit');
      await this.assertTransfromEditFlyoutExists();
    },

    async updateTransform() {
      await testSubjects.click('transformEditFlyoutUpdateButton');
      await retry.tryForTime(5000, async () => {
        await this.assertTransfromEditFlyoutMissing();
      });
    },
  };
}
