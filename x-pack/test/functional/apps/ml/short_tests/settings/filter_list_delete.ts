/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const testDataList = [1, 2].map((n) => ({
    filterId: `test_delete_filter_${n}`,
    description: `test description ${n}`,
    items: ['filter word 1', 'filter word 2', 'filter word 3'],
  }));

  describe('filter list delete', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      for (let index = 0; index < testDataList.length; index++) {
        const { filterId, description, items } = testDataList[index];

        await ml.api.createFilter(filterId, {
          description,
          items,
        });
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();

      // clean up created filters
      await asyncForEach(testDataList, async ({ filterId }) => {
        await ml.api.deleteFilter(filterId);
      });
    });

    it('deletes filter list with items', async () => {
      await ml.testExecution.logTestStep(
        'filter list delete loads the filter list management page'
      );
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToFilterListsManagement();

      await ml.testExecution.logTestStep(
        'filter list delete selects list entries and deletes them'
      );
      for (const testData of testDataList) {
        const { filterId } = testData;
        await ml.settingsFilterList.selectFilterListRow(filterId);
      }
      await ml.settingsFilterList.deleteFilterList();

      await ml.testExecution.logTestStep(
        'filter list delete validates selected filter lists are deleted'
      );
      await asyncForEach(testDataList, async ({ filterId }) => {
        await ml.settingsFilterList.assertFilterListRowNotExists(filterId);
      });
    });
  });
}
