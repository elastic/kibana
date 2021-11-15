/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataVisualizerIndexBasedProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover']);
  const queryBar = getService('queryBar');
  const filterBar = getService('filterBar');

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('dataVisualizerTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('dataVisualizerTotalDocCount');
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async clickUseFullDataButton(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled('dataVisualizerButtonUseFullData');
        await testSubjects.clickWhenNotDisabled('superDatePickerApplyTimeButton');
        await this.assertTotalDocumentCount(expectedFormattedTotalDocCount);
      });
    },

    async assertTotalDocCountHeaderExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerTotalDocCountHeader`);
      });
    },

    async assertTotalDocCountChartExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerDocumentCountChart`);
      });
    },

    async assertFieldCountPanelExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerFieldCountPanel`);
      });
    },

    async assertMetricFieldsSummaryExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerMetricFieldsSummary`);
      });
    },

    async assertVisibleMetricFieldsCount(count: number) {
      const expectedCount = count.toString();
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('dataVisualizerVisibleMetricFieldsCount');
        const actualCount = await testSubjects.getVisibleText(
          'dataVisualizerVisibleMetricFieldsCount'
        );
        expect(expectedCount).to.eql(
          expectedCount,
          `Expected visible metric fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertTotalMetricFieldsCount(count: number) {
      const expectedCount = count.toString();
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('dataVisualizerMetricFieldsCount');
        const actualCount = await testSubjects.getVisibleText(
          'dataVisualizerVisibleMetricFieldsCount'
        );
        expect(expectedCount).to.contain(
          expectedCount,
          `Expected total metric fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertVisibleFieldsCount(count: number) {
      const expectedCount = count.toString();
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('dataVisualizerVisibleFieldsCount');
        const actualCount = await testSubjects.getVisibleText('dataVisualizerVisibleFieldsCount');
        expect(expectedCount).to.eql(
          expectedCount,
          `Expected fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertTotalFieldsCount(count: number) {
      const expectedCount = count.toString();
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('dataVisualizerTotalFieldsCount');
        const actualCount = await testSubjects.getVisibleText('dataVisualizerTotalFieldsCount');
        expect(expectedCount).to.contain(
          expectedCount,
          `Expected total fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertFieldsSummaryExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerFieldsSummary`);
      });
    },

    async assertDataVisualizerTableExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerTable`);
      });
    },

    async assertActionsPanelExists() {
      await testSubjects.existOrFail('dataVisualizerActionsPanel');
    },

    async assertActionsPanelNotExists() {
      await testSubjects.missingOrFail('dataVisualizerActionsPanel');
    },

    async assertCreateAdvancedJobCardExists() {
      await testSubjects.existOrFail('dataVisualizerCreateAdvancedJobCard');
    },

    async assertCreateAdvancedJobCardNotExists() {
      await testSubjects.missingOrFail('dataVisualizerCreateAdvancedJobCard');
    },

    async assertRecognizerCardExists(moduleId: string) {
      await testSubjects.existOrFail(`mlRecognizerCard ${moduleId}`);
    },

    async assertRecognizerCardNotExists(moduleId: string) {
      await testSubjects.missingOrFail(`mlRecognizerCard ${moduleId}`);
    },

    async clickCreateAdvancedJobButton() {
      await testSubjects.clickWhenNotDisabled('dataVisualizerCreateAdvancedJobCard');
    },

    async assertCreateDataFrameAnalyticsCardExists() {
      await testSubjects.existOrFail('dataVisualizerCreateDataFrameAnalyticsCard');
    },

    async assertCreateDataFrameAnalyticsCardNotExists() {
      await testSubjects.missingOrFail('dataVisualizerCreateDataFrameAnalyticsCard');
    },

    async assertViewInDiscoverCard(shouldExist: boolean) {
      if (shouldExist) {
        await this.assertViewInDiscoverCardExists();
      } else {
        await this.assertViewInDiscoverCardNotExists();
      }
    },

    async assertViewInDiscoverCardExists() {
      await testSubjects.existOrFail('dataVisualizerViewInDiscoverCard');
    },

    async assertViewInDiscoverCardNotExists() {
      await testSubjects.missingOrFail('dataVisualizerViewInDiscoverCard');
    },

    async clickViewInDiscoverButton() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.clickWhenNotDisabled('dataVisualizerViewInDiscoverCard');
        await PageObjects.discover.waitForDiscoverAppOnScreen();
      });
    },

    async assertDiscoverPageQuery(expectedQueryString: string) {
      await PageObjects.discover.waitForDiscoverAppOnScreen();
      await retry.tryForTime(5000, async () => {
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql(
          expectedQueryString,
          `Expected Discover global query bar to have query '${expectedQueryString}', got '${queryString}'`
        );
      });
    },

    async assertDiscoverHitCount(expectedHitCountFormatted: string) {
      await PageObjects.discover.waitForDiscoverAppOnScreen();
      await retry.tryForTime(5000, async () => {
        const hitCount = await PageObjects.discover.getHitCount();
        expect(hitCount).to.eql(
          expectedHitCountFormatted,
          `Expected Discover hit count to be '${expectedHitCountFormatted}' (got '${hitCount}')`
        );
      });
    },

    async assertFilterBarFilterContent(filter: {
      key: string;
      value: string;
      enabled?: boolean;
      pinned?: boolean;
      negated?: boolean;
    }) {
      await retry.waitForWithTimeout(
        `filter ${JSON.stringify(filter)} to exist`,
        2000,
        async () => {
          return await filterBar.hasFilter(
            filter.key,
            filter.value,
            filter.enabled,
            filter.pinned,
            filter.negated
          );
        }
      );
    },
  };
}
