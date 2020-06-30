/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const config = getService('config');

  // FLAKY: https://github.com/elastic/kibana/issues/57413
  describe.skip('spaces feature controls', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');

        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it('shows Management navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Stack Management');
      });

      it(`allows settings to be changed`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
        const advancedSetting = await PageObjects.settings.getAdvancedSettings('dateFormat:tz');
        expect(advancedSetting).to.be('America/Phoenix');
      });
    });

    describe('space with Advanced Settings disabled', function () {
      before(async () => {
        // we need to load the following in every situation as deleting
        // a space deletes all of the associated saved objects
        await esArchiver.load('empty_kibana');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['advancedSettings'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
        await esArchiver.unload('empty_kibana');
      });

      it(`redirects to management home`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail('managementHome', {
          timeout: config.get('timeouts.waitFor'),
        });
      });
    });
  });
}
