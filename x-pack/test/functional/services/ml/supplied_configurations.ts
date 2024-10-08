/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSuppliedConfigurationsProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async getDataViewsTableRows() {
      return await testSubjects.findAll(
        'mlSuppliedConfigurationsFlyoutDataViewsTable > ~mlSuppliedConfigurationsDataViewsTableRow'
      );
    },
    async assertTableRowsCount(expectedCount: number) {
      const actualCount = (await this.getDataViewsTableRows()).length;
      expect(actualCount).to.eql(
        expectedCount,
        `Expect data views table rows count to be ${expectedCount}, got ${actualCount}`
      );
    },
    async assertAllConfigurationsAreLoaded() {
      const expectedLength = 18;
      await retry.tryForTime(10 * 1000, async () => {
        const cards = await testSubjects.findAll('mlSuppliedConfigurationsCard');
        expect(cards.length).to.eql(
          expectedLength,
          `Expected number of cards loaded to be ${expectedLength} but got ${cards.length}`
        );
      });
    },
    async assertFlyoutForSelectedIdExists(id: string) {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail(`mlSuppliedConfigurationsFlyout ${id}`);
      });
    },
    async assertFlyoutContainsExpectedTabs(tabs: string[]) {
      await retry.tryForTime(10 * 1000, async () => {
        for (const tab of tabs) {
          await testSubjects.existOrFail(`mlSuppliedConfigurationsFlyoutTab ${tab}`);
        }
      });
    },
    async clickSuppliedConfigCard(id: string) {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.existOrFail(`mlSuppliedConfigurationsCard ${id}`);
        await testSubjects.click(`mlSuppliedConfigurationsCard ${id}`);
        await this.assertFlyoutForSelectedIdExists(id);
      });
    },
    async runDataRecognizer(expectedNumberOfRows: number) {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.click('mlSuppliedConfigurationsFlyoutRunDataRecognizerButton');
        await testSubjects.existOrFail('mlSuppliedConfigurationsFlyoutDataViewsTable');
        await this.assertTableRowsCount(expectedNumberOfRows);
      });
    },
    async closeFlyout(id: string) {
      await browser.pressKeys(browser.keys.ESCAPE);
      await testSubjects.missingOrFail(`mlSuppliedConfigurationsFlyout ${id}`);
    },
  };
}
