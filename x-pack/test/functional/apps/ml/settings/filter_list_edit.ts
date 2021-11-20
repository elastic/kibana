/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const filterId = 'test_filter_list_edit';
  const keywordToDelete = 'keyword_to_delete';
  const oldKeyword = 'old_keyword';
  const oldDescription = 'Old filter list description';

  const newKeywords = ['new_keyword1', 'new_keyword2'];
  const newDescription = 'New filter list description';

  describe('filter list edit', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await ml.api.createFilter(filterId, {
        description: oldDescription,
        items: [keywordToDelete, oldKeyword],
      });
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.api.deleteFilter(filterId);
    });

    it('updates description and filter items', async () => {
      await ml.testExecution.logTestStep('filter list edit loads the filter list management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToFilterListsManagement();

      await ml.testExecution.logTestStep('filter list edit opens existing filter list');
      await ml.settingsFilterList.selectFilterListRowEditLink(filterId);
      await ml.settingsFilterList.assertFilterItemExists(keywordToDelete);
      await ml.settingsFilterList.assertFilterListDescriptionValue(oldDescription);

      await ml.testExecution.logTestStep('filter list edit deletes existing filter item');
      await ml.settingsFilterList.deleteFilterItem(keywordToDelete);

      await ml.testExecution.logTestStep('filter list edit sets new keywords and description');
      await ml.settingsFilterList.setFilterListDescription(newDescription);
      await ml.settingsFilterList.addFilterListKeywords(newKeywords);

      await ml.testExecution.logTestStep(
        'filter list edit saves the new filter list and displays it in the list of entries'
      );
      await ml.settingsFilterList.saveFilterList();
      await ml.settingsFilterList.assertFilterListRowExists(filterId);

      await ml.testExecution.logTestStep('filter list edit reopens the edited filter list');
      await ml.settingsFilterList.selectFilterListRowEditLink(filterId);

      await ml.testExecution.logTestStep(
        'filter list edit verifies the filter list description updated correctly'
      );
      await ml.settingsFilterList.assertFilterListDescriptionValue(newDescription);

      await ml.testExecution.logTestStep(
        'filter list edit verifies the filter items updated correctly'
      );
      await ml.settingsFilterList.assertFilterItemNotExists(keywordToDelete);
      await asyncForEach([...newKeywords, oldKeyword], async (filterItem) => {
        await ml.settingsFilterList.assertFilterItemExists(filterItem);
      });
    });
  });
}
