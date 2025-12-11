/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_PROJECT_SETTINGS } from '@kbn/serverless-security-settings';
import { SECURITY_SOLUTION_SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING } from '@kbn/management-settings-ids';
import { isEditorFieldSetting } from '@kbn/test-suites-xpack-platform/serverless/functional/test_suites/management/advanced_settings';
import {
  AI_CHAT_EXPERIENCE_TYPE,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const browser = getService('browser');
  const retry = getService('retry');

  const featureFlaggedSettings: string[] = [
    SECURITY_SOLUTION_SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING,
  ];

  // readOnly settings with readonlyMode set to ui are not available on the advanced settings page
  const READ_ONLY_SETTINGS: string[] = [
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
    AI_CHAT_EXPERIENCE_TYPE,
  ];

  describe('Security advanced settings', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.common.navigateToApp('settings');
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
        // Code editors don't have their test subjects rendered
        if (isEditorFieldSetting(settingId)) {
          continue;
        }
        // settings behind feature flags are not available in a general setup
        if (featureFlaggedSettings.includes(settingId)) {
          continue;
        }
        // readOnly settings wont appear on the advanced settings page
        if (READ_ONLY_SETTINGS.includes(settingId)) {
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
