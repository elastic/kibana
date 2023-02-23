/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export type MlCommonFieldStatsFlyout = ProvidedType<typeof MachineLearningFieldStatsFlyoutProvider>;

export function MachineLearningFieldStatsFlyoutProvider({ getService }: FtrProviderContext) {
  const browser = getService('browser');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async assertFieldStatContentByType(
      testSubj: string,
      fieldName: string,
      fieldType: 'keyword' | 'date' | 'number'
    ) {
      await retry.tryForTime(2000, async () => {
        // escape popover
        await browser.pressKeys(browser.keys.ESCAPE);

        if (fieldType === 'date') {
          await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-histogram`);
        }

        if (fieldType === 'keyword') {
          await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-topValues`);
        }

        // For numeric fields, we expect both the top values and the distribution chart
        if (fieldType === 'number') {
          // Assert top values exist
          await testSubjects.existOrFail(
            `mlFieldStatsFlyoutContent ${fieldName}-buttonGroup-topValuesButton`
          );
          await testSubjects.click(
            `mlFieldStatsFlyoutContent ${fieldName}-buttonGroup-topValuesButton`
          );

          await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-topValues`);

          // Assert distribution chart exists
          await testSubjects.existOrFail(
            `mlFieldStatsFlyoutContent ${fieldName}-buttonGroup-distributionButton`
          );
          await testSubjects.click(
            `mlFieldStatsFlyoutContent ${fieldName}-buttonGroup-distributionButton`
          );
          expect(
            await find.existsByCssSelector('[data-test-subj="mlFieldStatsFlyout"] .echChart')
          ).to.eql(true);
        }
      });
    },

    async assertFieldStatFlyoutContentFromTrigger(
      testSubj: string,
      fieldName: string,
      fieldType: 'keyword' | 'date' | 'number',
      expectedTopValuesContent?: string[]
    ) {
      const selector = `~${testSubj} > ~mlInspectFieldStatsButton-${fieldName}`;

      await retry.tryForTime(2000, async () => {
        await testSubjects.existOrFail(selector);
        await testSubjects.click(selector);
        await testSubjects.existOrFail('mlFieldStatsFlyout');
        await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-title`);
      });
      await this.assertFieldStatContentByType(testSubj, fieldName, fieldType);
      if (Array.isArray(expectedTopValuesContent)) {
        await this.assertTopValuesContent(fieldName, fieldType, expectedTopValuesContent);
      }
      await this.ensureFieldStatsFlyoutClosed();
    },

    async assertFieldStatFlyoutContentFromComboBoxTrigger(
      parentComboBoxSelector: string,
      fieldName: string,
      fieldType: 'keyword' | 'date' | 'number',
      expectedTopValuesContent?: string[]
    ) {
      const selector = `mlInspectFieldStatsButton-${fieldName}`;

      await retry.tryForTime(2000, async () => {
        const fieldTarget = await testSubjects.find(parentComboBoxSelector);
        await comboBox.openOptionsList(fieldTarget);

        await testSubjects.existOrFail(selector);
        await testSubjects.click(selector);
        await testSubjects.existOrFail('mlFieldStatsFlyout');

        await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-title`);

        await this.assertFieldStatContentByType(parentComboBoxSelector, fieldName, fieldType);

        if (Array.isArray(expectedTopValuesContent)) {
          await this.assertTopValuesContent(fieldName, fieldType, expectedTopValuesContent);
        }
        await this.ensureFieldStatsFlyoutClosed();
      });
    },

    async assertTopValuesContent(fieldName: string, fieldType: string, expectedValues: string[]) {
      await retry.tryForTime(2000, async () => {
        // check for top values rows
        await testSubjects.existOrFail(`mlFieldStatsFlyoutContent ${fieldName}-topValues`);
        const topValuesRows = await testSubjects.findAll(
          `mlFieldStatsFlyoutContent ${fieldName}-topValues-formattedFieldValue`
        );
        expect(topValuesRows.length).to.eql(
          expectedValues.length,
          `Expected top values to have ${expectedValues.length} (got ${topValuesRows.length})`
        );
        for (const [idx, expectedValue] of expectedValues.entries()) {
          const actualValue = await topValuesRows[idx].getVisibleText();
          expect(actualValue).to.eql(
            expectedValue,
            `Expected top value row to be ${expectedValue} (got ${actualValue})`
          );
        }
      });
    },

    async ensureFieldStatsFlyoutClosed() {
      const flyoutIsOpen = await testSubjects.exists('mlFieldStatsFlyout');
      if (flyoutIsOpen) {
        await retry.tryForTime(2000, async () => {
          await testSubjects.click('mlFieldStatsFlyout > euiFlyoutCloseButton');
          await testSubjects.missingOrFail('mlFieldStatsFlyout');
        });
      }
    },
  };
}
