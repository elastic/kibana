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

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('mlDataVisualizerTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('mlDataVisualizerTotalDocCount');
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async clickUseFullDataButton(expectedFormattedTotalDocCount: string) {
      await testSubjects.clickWhenNotDisabled('mlButtonUseFullData');
      await this.assertTotalDocumentCount(expectedFormattedTotalDocCount);
    },

    async assertTotalDocCountHeaderExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlDataVisualizerTotalDocCountHeader`);
      });
    },

    async assertTotalDocCountChartExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlFieldDataDocumentCountChart`);
      });
    },

    async assertFieldCountPanelExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlDataVisualizerFieldCountPanel`);
      });
    },

    async assertMetricFieldsSummaryExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlDataVisualizerMetricFieldsSummary`);
      });
    },

    async assertVisibleMetricFieldsCount(count: number) {
      const expectedCount = count.toString();
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('mlDataVisualizerVisibleMetricFieldsCount');
        const actualCount = await testSubjects.getVisibleText(
          'mlDataVisualizerVisibleMetricFieldsCount'
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
        await testSubjects.existOrFail('mlDataVisualizerMetricFieldsCount');
        const actualCount = await testSubjects.getVisibleText(
          'mlDataVisualizerVisibleMetricFieldsCount'
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
        await testSubjects.existOrFail('mlDataVisualizerVisibleFieldsCount');
        const actualCount = await testSubjects.getVisibleText('mlDataVisualizerVisibleFieldsCount');
        expect(expectedCount).to.eql(
          expectedCount,
          `Expected fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertTotalFieldsCount(count: number) {
      const expectedCount = count.toString();
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('mlDataVisualizerTotalFieldsCount');
        const actualCount = await testSubjects.getVisibleText('mlDataVisualizerTotalFieldsCount');
        expect(expectedCount).to.contain(
          expectedCount,
          `Expected total fields count to be '${expectedCount}' (got '${actualCount}')`
        );
      });
    },

    async assertFieldsSummaryExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlDataVisualizerFieldsSummary`);
      });
    },

    async assertDataVisualizerTableExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlDataVisualizerTable`);
      });
    },

    async assertActionsPanelExists() {
      await testSubjects.existOrFail('mlDataVisualizerActionsPanel');
    },

    async assertActionsPanelNotExists() {
      await testSubjects.missingOrFail('mlDataVisualizerActionsPanel');
    },

    async assertCreateAdvancedJobCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerCreateAdvancedJobCard');
    },

    async assertCreateAdvancedJobCardNotExists() {
      await testSubjects.missingOrFail('mlDataVisualizerCreateAdvancedJobCard');
    },

    async assertRecognizerCardExists(moduleId: string) {
      await testSubjects.existOrFail(`mlRecognizerCard ${moduleId}`);
    },

    async assertRecognizerCardNotExists(moduleId: string) {
      await testSubjects.missingOrFail(`mlRecognizerCard ${moduleId}`);
    },

    async clickCreateAdvancedJobButton() {
      await testSubjects.clickWhenNotDisabled('mlDataVisualizerCreateAdvancedJobCard');
    },

    async assertViewInDiscoverCardExists() {
      await testSubjects.existOrFail('mlDataVisualizerViewInDiscoverCard');
    },

    async assertViewInDiscoverCardNotExists() {
      await testSubjects.missingOrFail('mlDataVisualizerViewInDiscoverCard');
    },

    async clickViewInDiscoverButton() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.clickWhenNotDisabled('mlDataVisualizerViewInDiscoverCard');
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
  };
}
