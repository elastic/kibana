/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');

  describe('Stack Management -Advanced Settings', () => {
    // click on Management > Advanced settings
    it('click on advanced settings ', async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.click('settings');
      await a11y.testAppSnapshot();
    });

    // clicking on the top search bar
    it('adv settings - search ', async () => {
      await testSubjects.click('settingsSearchBar');
      await a11y.testAppSnapshot();
    });

    // clicking on the category dropdown
    it('adv settings - category -dropdown ', async () => {
      await testSubjects.click('settingsSearchBar');
      await a11y.testAppSnapshot();
    });

    // clicking on the toggle button
    it('adv settings - toggle ', async () => {
      await testSubjects.click('advancedSetting-editField-csv:quoteValues');
      await a11y.testAppSnapshot();
    });

    // clicking on editor panel
    it('adv settings - edit ', async () => {
      await testSubjects.click('advancedSetting-editField-csv:separator');
      await a11y.testAppSnapshot();
    });

    // clicking on save button
    it('adv settings - save', async () => {
      await testSubjects.click('advancedSetting-saveButton');
      await a11y.testAppSnapshot();
    });
  });
}
