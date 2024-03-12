/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  describe('Stack Management -Advanced Settings Accessibility', () => {
    // click on Management > Advanced settings
    it('click on advanced settings ', async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.click('settings');
      await toasts.dismissAll();
      await a11y.testAppSnapshot();
    });

    // clicking on the top search bar
    it('adv settings - search ', async () => {
      await testSubjects.click('settingsSearchBar');
      await toasts.dismissAll();
      await a11y.testAppSnapshot();
    });

    // clicking on the category dropdown
    it('adv settings - category -dropdown ', async () => {
      await testSubjects.click('settingsSearchBar');
      await toasts.dismissAll();
      await a11y.testAppSnapshot();
    });

    // clicking on the toggle button
    it('adv settings - toggle ', async () => {
      await testSubjects.click('management-settings-editField-csv:quoteValues');
      await toasts.dismissAll();
      await a11y.testAppSnapshot();
    });

    // clicking on editor panel
    it('adv settings - edit ', async () => {
      await testSubjects.click('management-settings-editField-csv:separator');
      await toasts.dismissAll();
      await a11y.testAppSnapshot();
    });

    // clicking on save button
    it('adv settings - save', async () => {
      await testSubjects.click('settings-save-button');
      await toasts.dismissAll();
      await a11y.testAppSnapshot();
    });
  });
}
