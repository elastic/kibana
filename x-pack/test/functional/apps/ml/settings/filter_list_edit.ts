/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const filterId = 'test_filter_list_edit';
  const keywordToDelete = 'keyword_to_delete';
  const oldDescription = 'Old filter list description';

  const newKeywords = ['new_keyword1', 'new_keyword2'];
  const newDescription = 'New filter list description';

  describe('filter list edit', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await ml.api.createFilter(filterId, {
        description: 'Old filter list description',
        items: [keywordToDelete, 'old_keyword'],
      });
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.api.deleteFilter(filterId);
    });

    it('updates existing list', async () => {
      await ml.testExecution.logTestStep('loads the filter list management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToFilterListsManagement();

      await ml.testExecution.logTestStep('finds the filter list to edit');
      await ml.settingsFilterList.selectFilterListRowEditLink(filterId);
      await ml.settingsFilterList.assertFilterItemExists(keywordToDelete);
      await ml.settingsFilterList.assertFilterListDescriptionValue(oldDescription);

      await ml.testExecution.logTestStep('deletes existing filter item');
      await ml.settingsFilterList.deleteFilterItem(keywordToDelete);

      await ml.testExecution.logTestStep('sets new keywords and description');
      await ml.settingsFilterList.setFilterListDescription(newDescription);
      await ml.settingsFilterList.addFilterListKeywords(newKeywords);
      await ml.settingsFilterList.saveFilterList();
      await ml.settingsFilterList.assertFilterListRowExists(filterId);
    });
  });
}
