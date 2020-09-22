/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header']);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const a11y = getService('a11y');

  describe('Stack Management -Advanced Settings', () => {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await a11y.testAppSnapshot();
    });

    it('click on advanced settings ', async () => {
      await PageObjects.settings.navigateToApp('management');
      // await PageObjects.settings.click('settings');
      await a11y.testAppSnapshot();
    });

    it('adv settings - search ', async () => {
      await PageObjects.settings.click('settingsSearchBar');
      await a11y.testAppSnapshot();
    });

    it('adv settings - category -dropdown ', async () => {
      await PageObjects.settings.click('settingsSearchBar');
      await a11y.testAppSnapshot();
    });

    it('adv settings - toggle ', async () => {
      await PageObjects.settings.click('advancedSetting-editField-csv:quoteValues');
      await a11y.testAppSnapshot();
    });

    it('adv settings - edit ', async () => {
      await PageObjects.settings.click('advancedSetting-editField-csv:separator');
      await a11y.testAppSnapshot();
    });

    it('adv settings - save', async () => {
      await PageObjects.settings.click('advancedSetting-saveButton');
      await a11y.testAppSnapshot();
    });

    it('adv settings - cancel', async () => {
      await PageObjects.settings.click('advancedSetting-cancelButton');
      await a11y.testAppSnapshot();
    });
  });
}
