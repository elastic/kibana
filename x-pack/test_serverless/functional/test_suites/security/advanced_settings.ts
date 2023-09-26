/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_PROJECT_SETTINGS } from '@kbn/serverless-security-settings';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'svlCommonPage']);
  const browser = getService('browser');
  const retry = getService('retry');

  // Skip until we enable the Advanced settings app in serverless
  describe.skip('Security advanced settings', function () {
    before(async () => {
      await pageObjects.svlCommonPage.navigateToApp('advancedSettings');
    });

    it('renders the page', async () => {
      await retry.waitFor('title to be visible', async () => {
        return await testSubjects.exists('managementSettingsTitle');
      });

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/settings`);
    });

    describe('renders security settings', () => {
      for (const settingId of SECURITY_PROJECT_SETTINGS) {
        it('renders ' + settingId + ' edit field', async () => {
          const fieldTestSubj = 'advancedSetting-editField-' + settingId;
          expect(await testSubjects.exists(fieldTestSubj)).to.be(true);
        });
      }
    });
  });
};
