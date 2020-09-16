/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const testSubjects = getService('testSubjects');

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

    it('filter list delete loads filter lists and deletes item', async () => {
      await ml.testExecution.logTestStep(
        'filter list creation loads the filter list management page'
      );
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToFilterListsManagement();

      await ml.testExecution.logTestStep('filter list creates new filter lists');
      for (const testData of testDataList) {
        const { filterId } = testData;
        await ml.settingsFilterList.selectFilterListRow(filterId);
      }
      await testSubjects.existOrFail('mlFilterListsDeleteButton');
      await ml.settingsFilterList.assertDeleteFilterListButtonEnabled(true);
      await testSubjects.click('mlFilterListsDeleteButton');
      await testSubjects.existOrFail('mlFilterListsDeleteButton');
      await testSubjects.existOrFail('mlFilterListDeleteConfirmation');
      await testSubjects.click('confirmModalConfirmButton');

      await asyncForEach(testDataList, async ({ filterId }) => {
        await ml.settingsFilterList.assertFilterListRowMissing(filterId);
      });
    });
  });
}
