/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALL_COMMON_SETTINGS } from '@kbn/serverless-common-settings';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common']);
  const browser = getService('browser');
  const retry = getService('retry');

  // Skip until we enable the Advanced settings app in serverless
  describe.skip('Common advanced settings', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('advancedSettings');
    });

    it('renders the page', async () => {
      await retry.waitFor('title to be visible', async () => {
        return await testSubjects.exists('managementSettingsTitle');
      });

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/settings`);
    });

    describe('renders common settings', () => {
      for (const settingId of ALL_COMMON_SETTINGS) {
        it('renders ' + settingId + ' edit field', async () => {
          const isColorPickerField =
            settingId === 'banners:textColor' || settingId === 'banners:backgroundColor';
          const fieldTestSubj =
            (isColorPickerField ? 'euiColorPickerAnchor ' : '') +
            'advancedSetting-editField-' +
            settingId;
          expect(await testSubjects.exists(fieldTestSubj)).to.be(true);
        });
      }
    });
  });
};
