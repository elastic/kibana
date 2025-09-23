/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows/common/constants';
import { SEARCH_PROJECT_SETTINGS } from '@kbn/serverless-search-settings';
import { isEditorFieldSetting } from '@kbn/test-suites-xpack-platform/serverless/functional/test_suites/management/advanced_settings';
import type { FtrProviderContext } from '../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const browser = getService('browser');
  const retry = getService('retry');

  const IGNORED_SETTINGS = [
    // corresponding plugin not enabled in production yet
    WORKFLOWS_UI_SETTING_ID,
  ];

  describe('Search advanced settings', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsViewer();
      await pageObjects.common.navigateToApp('settings');
    });

    it('renders the page', async () => {
      await retry.waitFor('title to be visible', async () => {
        return await testSubjects.exists('managementSettingsTitle');
      });

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/settings`);
    });

    describe('renders search settings', () => {
      for (const settingId of SEARCH_PROJECT_SETTINGS) {
        // Code editors don't have their test subjects rendered
        if (isEditorFieldSetting(settingId)) {
          continue;
        }
        if (IGNORED_SETTINGS.includes(settingId)) {
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
