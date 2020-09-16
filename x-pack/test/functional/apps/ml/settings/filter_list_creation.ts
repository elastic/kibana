/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const testDataList = [1, 2, 3].map((n) => ({
    filterId: `test_create_filter_${n}`,
    description: `test description ${n}`,
    keywords: ['filter word 1', 'filter word 2', 'filter word 3'],
  }));

  describe('filter list creation', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      // clean up created filters
      await asyncForEach(testDataList, async ({ filterId }) => {
        await ml.api.deleteFilter(filterId);
      });
    });

    it('filter list creation creates new filter list', async () => {
      await ml.testExecution.logTestStep(
        'filter list creation loads the filter list management page'
      );
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToFilterListsManagement();

      await ml.testExecution.logTestStep('filter list creates new filter lists');
      for (const testData of testDataList) {
        await ml.testExecution.logTestStep('filter list creation loads the filter creation page');
        await ml.settingsFilterList.navigateToFilterListCreationPage();

        await ml.testExecution.logTestStep('filter list sets the list name and description');

        const { filterId, description, keywords } = testData;
        await ml.settingsFilterList.setFilterListId(filterId);
        await ml.settingsFilterList.setFilterListDescription(description);
        await ml.settingsFilterList.addFilterListKeywords(keywords);
        await ml.testExecution.logTestStep('filter list saves the settings');
        await ml.settingsFilterList.saveFilterList();
        await ml.settingsFilterList.assertFilterListRowExists(filterId);
      }
    });
  });
}
