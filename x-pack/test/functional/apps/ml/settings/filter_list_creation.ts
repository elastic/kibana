/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const filterId = 'test_create_filter';
  const description = 'test description';
  const keywords = ['filter word 1', 'filter word 2', 'filter word 3'];

  describe('filter list creation', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      // clean up created filters
      await ml.api.deleteFilter(filterId);
    });

    it('creates new filter list', async () => {
      await ml.testExecution.logTestStep(
        'filter list creation loads the filter list management page'
      );
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToFilterListsManagement();

      await ml.testExecution.logTestStep('filter list creation loads the filter creation page');
      await ml.settingsFilterList.navigateToFilterListCreationPage();

      await ml.testExecution.logTestStep('filter list creation sets the list name and description');
      await ml.settingsFilterList.setFilterListId(filterId);
      await ml.settingsFilterList.setFilterListDescription(description);

      await ml.testExecution.logTestStep('filter list creation adds items to the filter list');
      await ml.settingsFilterList.addFilterListKeywords(keywords);
      await ml.testExecution.logTestStep('filter list creation saves the settings');
      await ml.settingsFilterList.saveFilterList();
      await ml.settingsFilterList.assertFilterListRowExists(filterId);
    });
  });
}
