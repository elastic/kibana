/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALL_COMMON_SETTINGS } from '@kbn/serverless-common-settings';
import * as settings from '@kbn/management-settings-ids';
import { FtrProviderContext } from '../../../ftr_provider_context';

const editorSettings = new Set<string>([
  settings.BANNERS_TEXT_CONTENT_ID,
  settings.DATE_FORMAT_SCALED_ID,
  settings.ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID,
  settings.NOTIFICATIONS_BANNER_ID,
  settings.TIMEPICKER_TIME_DEFAULTS_ID,
  settings.TIMEPICKER_QUICK_RANGES_ID,
  settings.SECURITY_SOLUTION_REFRESH_INTERVAL_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_TIME_DEFAULTS_ID,
  settings.SECURITY_SOLUTION_RULES_TABLE_REFRESH_ID,
  settings.SECURITY_SOLUTION_IP_REPUTATION_LINKS_ID,
]);
export const isEditorFieldSetting = (settingId: string) => editorSettings.has(settingId);

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['svlCommonPage', 'common']);
  const browser = getService('browser');
  const retry = getService('retry');

  describe('Common advanced settings', function () {
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

    describe('renders common settings', () => {
      for (const settingId of ALL_COMMON_SETTINGS) {
        // Code editors don't have their test subjects rendered
        if (isEditorFieldSetting(settingId)) {
          continue;
        }
        const isColorPickerField =
          settingId === settings.BANNERS_TEXT_COLOR_ID ||
          settingId === settings.BANNERS_BACKGROUND_COLOR_ID;
        const fieldTestSubj =
          (isColorPickerField ? 'euiColorPickerAnchor ' : '') +
          'management-settings-editField-' +
          settingId;
        it('renders ' + settingId + ' edit field', async () => {
          expect(await testSubjects.exists(fieldTestSubj)).to.be(true);
        });
      }
    });
  });
};
