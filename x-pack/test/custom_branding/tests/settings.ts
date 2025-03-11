/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
  const PageObjects = getPageObjects(['settings', 'common', 'dashboard', 'timePicker', 'header']);

  describe('custom branding', function describeIndexTests() {
    const resetSettings = async () => {
      const advancedSetting = await PageObjects.settings.getAdvancedSettings(
        'xpackCustomBranding:pageTitle'
      );
      if (advancedSetting !== '') {
        await PageObjects.settings.clearAdvancedSettings('xpackCustomBranding:pageTitle');
      }
      try {
        await find.byCssSelector('img[alt="xpackCustomBranding:logo"]');
        await PageObjects.settings.clearAdvancedSettings('xpackCustomBranding:logo');
      } catch (e) {
        log.debug('It is expected not to find custom branding properties set');
      }
      try {
        await find.byCssSelector('img[alt="xpackCustomBranding:customizedLogo"]');
        await PageObjects.settings.clearAdvancedSettings('xpackCustomBranding:customizedLogo');
      } catch (e) {
        log.debug('It is expected not to find custom branding properties set');
      }
    };

    const goToSettings = async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaGlobalSettings();
    };

    before(async function () {
      await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaGlobalSettings();
      // clear settings before tests start
      await resetSettings();
    });

    after(async function () {
      await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaGlobalSettings();
      await resetSettings();
    });

    beforeEach(async function () {
      await goToSettings();
    });

    it('should allow setting custom page title through advanced settings', async function () {
      const pageTitle = 'Custom Page Title';
      const settingName = 'xpackCustomBranding:pageTitle';
      await PageObjects.settings.setAdvancedSettingsInput(settingName, pageTitle);

      const advancedSetting = await PageObjects.settings.getAdvancedSettings(settingName);
      expect(advancedSetting).to.be(pageTitle);
    });

    it('should allow setting custom logo through advanced settings', async function () {
      const settingName = 'xpackCustomBranding:logo';
      await PageObjects.settings.setAdvancedSettingsImage(
        settingName,
        require.resolve('./acme_logo.png')
      );
      await goToSettings();
      const img = await find.byCssSelector('img[alt="logo"]');
      const imgSrc = (await img.getAttribute('src')) ?? '';
      expect(imgSrc.startsWith('data:image/png')).to.be(true);
    });

    it('should allow setting custom logo text through advanced settings', async function () {
      const settingName = 'xpackCustomBranding:customizedLogo';
      await PageObjects.settings.setAdvancedSettingsImage(
        settingName,
        require.resolve('./acme_text.png')
      );
      await goToSettings();
      const img = await testSubjects.find('logoMark');
      const imgSrc = (await img.getAttribute('src')) ?? '';
      expect(imgSrc.startsWith('data:image/png')).to.be(true);
    });
  });
}
