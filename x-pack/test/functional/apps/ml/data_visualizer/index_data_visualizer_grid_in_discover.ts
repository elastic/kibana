/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { TestData, MetricFieldVisConfig } from './types';

const SHOW_FIELD_STATISTICS = 'discover:showFieldStatistics';
import {
  farequoteIndexPatternTestData,
  farequoteKQLSearchTestData,
  farequoteLuceneFiltersSearchTestData,
  farequoteKQLFiltersSearchTestData,
  farequoteLuceneSearchTestData,
  sampleLogTestData,
} from './index_test_data';
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings']);
  const ml = getService('ml');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

  const selectIndexPattern = async (indexPattern: string) => {
    await retry.tryForTime(2 * 1000, async () => {
      await PageObjects.discover.selectIndexPattern(indexPattern);
      const indexPatternTitle = await testSubjects.getVisibleText('indexPattern-switch-link');
      expect(indexPatternTitle).to.be(indexPattern);
    });
  };

  const clearAdvancedSetting = async (propertyName: string) => {
    await retry.tryForTime(2 * 1000, async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
        shouldUseHashForSubUrl: false,
      });
      if ((await PageObjects.settings.getAdvancedSettingCheckbox(propertyName)) === 'true') {
        await PageObjects.settings.clearAdvancedSettings(propertyName);
      }
    });
  };

  const setAdvancedSettingCheckbox = async (propertyName: string, checkedState: boolean) => {
    await retry.tryForTime(2 * 1000, async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.click('settings');
      await toasts.dismissAllToasts();
      await PageObjects.settings.toggleAdvancedSettingCheckbox(propertyName, checkedState);
    });
  };

  function runTestsWhenDisabled(testData: TestData) {
    it('should not show view mode toggle or Field stats table', async function () {
      await PageObjects.common.navigateToApp('discover');
      if (testData.isSavedSearch) {
        await retry.tryForTime(2 * 1000, async () => {
          await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
        });
      } else {
        await selectIndexPattern(testData.sourceIndexOrSavedSearch);
      }

      await PageObjects.timePicker.setAbsoluteRange(
        'Jan 1, 2016 @ 00:00:00.000',
        'Nov 1, 2020 @ 00:00:00.000'
      );

      await PageObjects.discover.assertViewModeToggleNotExists();
      await PageObjects.discover.assertFieldStatsTableNotExists();
    });
  }

  function runTests(testData: TestData) {
    describe(`with ${testData.suiteTitle}`, function () {
      it(`displays the 'Field statistics' table content correctly`, async function () {
        await PageObjects.common.navigateToApp('discover');
        if (testData.isSavedSearch) {
          await retry.tryForTime(2 * 1000, async () => {
            await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
          });
        } else {
          await selectIndexPattern(testData.sourceIndexOrSavedSearch);
        }
        await PageObjects.timePicker.setAbsoluteRange(
          'Jan 1, 2016 @ 00:00:00.000',
          'Nov 1, 2020 @ 00:00:00.000'
        );

        await PageObjects.discover.assertHitCount(testData.expected.totalDocCountFormatted);
        await PageObjects.discover.assertViewModeToggleExists();
        await PageObjects.discover.clickViewModeFieldStatsButton();
        await ml.testExecution.logTestStep(
          'displays details for metric fields and non-metric fields correctly'
        );
        for (const fieldRow of testData.expected.metricFields as Array<
          Required<MetricFieldVisConfig>
        >) {
          await ml.dataVisualizerTable.assertNumberFieldContents(
            fieldRow.fieldName,
            fieldRow.docCountFormatted,
            fieldRow.topValuesCount,
            fieldRow.viewableInLens
          );
        }

        for (const fieldRow of testData.expected.nonMetricFields!) {
          await ml.dataVisualizerTable.assertNonMetricFieldContents(
            fieldRow.type,
            fieldRow.fieldName!,
            fieldRow.docCountFormatted,
            fieldRow.exampleCount,
            fieldRow.viewableInLens,
            false,
            fieldRow.exampleContent
          );
        }
      });
    });
  }

  describe('field statistics in Discover', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/module_sample_logs');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_module_sample_logs', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async function () {
      await clearAdvancedSetting(SHOW_FIELD_STATISTICS);
    });

    describe('when enabled', function () {
      before(async function () {
        await setAdvancedSettingCheckbox(SHOW_FIELD_STATISTICS, true);
      });

      after(async function () {
        await clearAdvancedSetting(SHOW_FIELD_STATISTICS);
      });

      runTests(farequoteIndexPatternTestData);
      runTests(farequoteKQLSearchTestData);
      // runTests(farequoteLuceneSearchTestData);
      // runTests(farequoteKQLFiltersSearchTestData);
      // runTests(farequoteLuceneFiltersSearchTestData);
      // runTests(sampleLogTestData);
    });

    describe('when disabled', function () {
      before(async function () {
        // Ensure that the setting is set to default state which is false
        await setAdvancedSettingCheckbox(SHOW_FIELD_STATISTICS, false);
      });

      runTestsWhenDisabled(farequoteIndexPatternTestData);
    });
  });
}
