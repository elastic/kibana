/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';

export type MlCustomUrls = ProvidedType<typeof MachineLearningCustomUrlsProvider>;

export function MachineLearningCustomUrlsProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const PageObjects = getPageObjects(['dashboard', 'discover', 'header']);

  return {
    async assertCustomUrlsLength(expectedLength: number) {
      const customUrls = await testSubjects.findAll('mlJobEditCustomUrlItemLabel');
      const actualLength = customUrls.length;
      expect(expectedLength).to.eql(
        actualLength,
        `Expected number of custom urls to be '${expectedLength}' (got '${actualLength}')`
      );
    },

    async assertCustomUrlLabelValue(expectedValue: string) {
      const actualCustomUrlLabel = await testSubjects.getAttribute(
        'mlJobCustomUrlLabelInput',
        'value'
      );
      expect(actualCustomUrlLabel).to.eql(
        expectedValue,
        `Expected custom url label to be '${expectedValue}' (got '${actualCustomUrlLabel}')`
      );
    },

    async setCustomUrlLabel(customUrlLabel: string) {
      await testSubjects.setValue('mlJobCustomUrlLabelInput', customUrlLabel, {
        clearWithKeyboard: true,
      });
      await this.assertCustomUrlLabelValue(customUrlLabel);
    },

    async assertCustomUrlQueryEntitySelection(expectedFieldNames: string[]) {
      const actualFieldNames = await comboBox.getComboBoxSelectedOptions(
        'mlJobCustomUrlQueryEntitiesInput > comboBoxInput'
      );
      expect(actualFieldNames).to.eql(
        expectedFieldNames,
        `Expected query entity selection to be '${expectedFieldNames}' (got '${actualFieldNames}')`
      );
    },

    async setCustomUrlQueryEntityFieldNames(fieldNames: string[]) {
      for (const fieldName of fieldNames) {
        await comboBox.set('mlJobCustomUrlQueryEntitiesInput > comboBoxInput', fieldName);
      }
      await this.assertCustomUrlQueryEntitySelection(fieldNames);
    },

    async assertCustomUrlTimeRangeIntervalValue(expectedInterval: string) {
      const actualCustomUrlTimeRangeInterval = await testSubjects.getAttribute(
        'mlJobCustomUrlTimeRangeIntervalInput',
        'value'
      );
      expect(actualCustomUrlTimeRangeInterval).to.eql(
        expectedInterval,
        `Expected custom url time range interval to be '${expectedInterval}' (got '${actualCustomUrlTimeRangeInterval}')`
      );
    },

    async setCustomUrlTimeRangeInterval(interval: string) {
      await testSubjects.setValue('mlJobCustomUrlTimeRangeIntervalInput', interval, {
        clearWithKeyboard: true,
      });
      await this.assertCustomUrlTimeRangeIntervalValue(interval);
    },

    async assertCustomUrlOtherTypeUrlValue(expectedUrl: string) {
      const actualCustomUrlValue = await testSubjects.getAttribute(
        'mlJobCustomUrlOtherTypeUrlInput',
        'value'
      );
      expect(actualCustomUrlValue).to.eql(
        expectedUrl,
        `Expected other type custom url value to be '${expectedUrl}' (got '${actualCustomUrlValue}')`
      );
    },

    async setCustomUrlOtherTypeUrl(url: string) {
      await testSubjects.setValue('mlJobCustomUrlOtherTypeUrlInput', url, {
        clearWithKeyboard: true,
      });
      await this.assertCustomUrlOtherTypeUrlValue(url);
    },

    async assertCustomUrlLabel(index: number, expectedLabel: string) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlLabelInput_${index}`, { timeout: 1000 });
      const actualLabel = await testSubjects.getAttribute(
        `mlJobEditCustomUrlLabelInput_${index}`,
        'value'
      );
      expect(actualLabel).to.eql(
        expectedLabel,
        `Expected custom url item to be '${expectedLabel}' (got '${actualLabel}')`
      );
    },

    async assertCustomUrlUrlValue(index: number, expectedUrl: string) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlInput_${index}`);
      const actualUrl = await testSubjects.getAttribute(
        `mlJobEditCustomUrlInput_${index}`,
        'value'
      );
      expect(actualUrl).to.eql(
        expectedUrl,
        `Expected custom url item to be '${expectedUrl}' (got '${actualUrl}')`
      );
    },

    async editCustomUrlLabel(index: number, label: string) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlLabelInput_${index}`);
      await testSubjects.setValue(`mlJobEditCustomUrlLabelInput_${index}`, label, {
        clearWithKeyboard: true,
      });
      await this.assertCustomUrlLabel(index, label);
    },

    async editCustomUrlUrlValue(index: number, urlValue: string) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlInput_${index}`);
      await testSubjects.setValue(`mlJobEditCustomUrlInput_${index}`, urlValue, {
        clearWithKeyboard: true,
      });

      // Click away, so the textarea reverts back to the standard input.
      await testSubjects.click(`mlJobEditCustomUrlLabelInput_${index}`);
      await this.assertCustomUrlUrlValue(index, urlValue);
    },

    async deleteCustomUrl(index: number) {
      await testSubjects.existOrFail(`mlJobEditDeleteCustomUrlButton_${index}`);
      const beforeCustomUrls = await testSubjects.findAll('mlJobEditCustomUrlItemLabel');
      await testSubjects.click(`mlJobEditDeleteCustomUrlButton_${index}`);
      await this.assertCustomUrlsLength(beforeCustomUrls.length - 1);
    },

    /**
     * Submits the custom url form and adds it to the list.
     * @param formContainerSelector - selector for the element that wraps the custom url creation form.
     */
    async saveCustomUrl(formContainerSelector: string) {
      await testSubjects.click('mlJobAddCustomUrl');
      await testSubjects.missingOrFail(formContainerSelector, { timeout: 10 * 1000 });
    },

    async clickTestCustomUrl(index: number) {
      await testSubjects.existOrFail(`mlJobEditCustomUrlItem_${index}`);
      await testSubjects.click(`mlJobEditCustomUrlItem_${index} > mlJobEditTestCustomUrlButton`);
      await PageObjects.header.waitUntilLoadingHasFinished();
    },

    async assertDiscoverCustomUrlAction(expectedHitCountFormatted: string) {
      await PageObjects.discover.waitForDiscoverAppOnScreen();
      // Make sure all existing popovers are closed
      await browser.pressKeys(browser.keys.ESCAPE);

      // During cloud tests, the small browser width might cause hit count to be invisible
      // so temporarily collapsing the sidebar ensures the count shows
      await PageObjects.discover.closeSidebar();
      await retry.tryForTime(10 * 1000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.eql(
          expectedHitCountFormatted,
          `Expected Discover hit count to be '${expectedHitCountFormatted}' (got '${hitCount}')`
        );
      });
    },

    async assertDashboardCustomUrlAction(expectedPanelCount: number) {
      await PageObjects.dashboard.waitForRenderComplete();
      await retry.tryForTime(5000, async () => {
        const panelCount = await PageObjects.dashboard.getPanelCount();
        expect(panelCount).to.eql(
          expectedPanelCount,
          `Expected Dashboard panel count to be '${expectedPanelCount}' (got '${panelCount}')`
        );
      });
    },
  };
}
