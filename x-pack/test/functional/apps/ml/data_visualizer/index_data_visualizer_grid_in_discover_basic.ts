/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { TestData } from './types';

const SHOW_FIELD_STATISTICS = 'discover:showFieldStatistics';
import { farequoteDataViewTestData } from './index_test_data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings']);
  const ml = getService('ml');
  const retry = getService('retry');
  const dataViews = getService('dataViews');

  const startTime = 'Jan 1, 2016 @ 00:00:00.000';
  const endTime = 'Nov 1, 2020 @ 00:00:00.000';

  function runTestsWhenDisabled(testData: TestData) {
    it('should not show view mode toggle or Field stats table', async function () {
      await PageObjects.common.navigateToApp('discover');
      if (testData.isSavedSearch) {
        await retry.tryForTime(2 * 1000, async () => {
          await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
        });
      } else {
        await dataViews.switchToAndValidate(testData.sourceIndexOrSavedSearch);
      }

      await PageObjects.timePicker.setAbsoluteRange(startTime, endTime);

      await PageObjects.discover.assertViewModeToggleNotExists();
      await PageObjects.discover.assertFieldStatsTableNotExists();
    });
  }

  describe('field statistics in Discover (basic license)', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createDataViewIfNeeded('ft_module_sample_logs', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async function () {
      await ml.testResources.clearAdvancedSettingProperty(SHOW_FIELD_STATISTICS);
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    describe('when disabled', function () {
      before(async function () {
        // Ensure that the setting is set to default state which is false
        await ml.testResources.setAdvancedSettingProperty(SHOW_FIELD_STATISTICS, false);
      });

      runTestsWhenDisabled(farequoteDataViewTestData);
    });
  });
}
