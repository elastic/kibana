/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');

  describe('security feature controls', () => {
    describe('global advanced_settings all privileges', () => {
      before(async () => {
        await security.role.create('global_advanced_settings_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_advanced_settings_all_user', {
          password: 'global_advanced_settings_all_user-password',
          roles: ['global_advanced_settings_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();
        await PageObjects.security.login(
          'global_advanced_settings_all_user',
          'global_advanced_settings_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_advanced_settings_all_role'),
          security.user.delete('global_advanced_settings_all_user'),
        ]);
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Stack Management', 'Stack Management']);
      });

      it(`allows settings to be changed`, async () => {
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.setAdvancedSettingsSelect('dateFormat:tz', 'America/Phoenix');
        const advancedSetting = await PageObjects.settings.getAdvancedSettings('dateFormat:tz');
        expect(advancedSetting).to.be('America/Phoenix');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });
    });

    describe('global advanced_settings read-only privileges', () => {
      before(async () => {
        await security.role.create('global_advanced_settings_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                advancedSettings: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_advanced_settings_read_user', {
          password: 'global_advanced_settings_read_user-password',
          roles: ['global_advanced_settings_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_advanced_settings_read_user',
          'global_advanced_settings_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );

        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
      });

      after(async () => {
        await security.role.delete('global_advanced_settings_read_role');
        await security.user.delete('global_advanced_settings_read_user');
      });

      it('shows Management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Stack Management']);
      });

      it(`does not allow settings to be changed`, async () => {
        await PageObjects.settings.clickKibanaSettings();
        await PageObjects.settings.expectDisabledAdvancedSetting('dateFormat:tz');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    describe('no advanced_settings privileges', function () {
      before(async () => {
        await security.role.create('no_advanced_settings_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_advanced_settings_privileges_user', {
          password: 'no_advanced_settings_privileges_user-password',
          roles: ['no_advanced_settings_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_advanced_settings_privileges_user',
          'no_advanced_settings_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_advanced_settings_privileges_role');
        await security.user.delete('no_advanced_settings_privileges_user');
      });

      it('does not show Management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`does not allow navigation to advanced settings; shows "not found" error`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/settings', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.existOrFail('appNotFoundPageContent');
      });
    });
  });
}
