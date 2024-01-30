/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_PROJECT_SETTINGS } from '@kbn/serverless-observability-settings';
import { FtrProviderContext } from '../../ftr_provider_context';
import { isEditorFieldSetting } from '../common/management/advanced_settings';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Observability advanced settings', function () {
    before(async () => {
      await pageObjects.svlCommonPage.login();
      await pageObjects.common.navigateToApp('settings');
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('renders the page', async () => {
      await retry.waitFor('title to be visible', async () => {
        return await testSubjects.exists('managementSettingsTitle');
      });

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/settings`);
    });

    describe('renders observability settings', () => {
      for (const settingId of OBSERVABILITY_PROJECT_SETTINGS) {
        // Code editors don't have their test subjects rendered
        if (isEditorFieldSetting(settingId)) {
          continue;
        }
        it('renders ' + settingId + ' edit field', async () => {
          const fieldTestSubj = 'management-settings-editField-' + settingId;
          expect(await testSubjects.exists(fieldTestSubj)).to.be(true);
        });
      }
    });
  });
};
