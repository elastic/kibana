/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');

  describe('security', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('global data views all privileges', () => {
      before(async () => {
        await security.role.create('global_index_patterns_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                indexPatterns: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_index_patterns_all_user', {
          password: 'global_index_patterns_all_user-password',
          roles: ['global_index_patterns_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_index_patterns_all_user',
          'global_index_patterns_all_user-password',
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
          security.role.delete('global_index_patterns_all_role'),
          security.user.delete('global_index_patterns_all_user'),
        ]);
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Stack Management']);
      });

      it(`index pattern listing shows create button`, async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('createIndexPatternButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });
    });

    describe('global data views read-only privileges', () => {
      before(async () => {
        await security.role.create('global_index_patterns_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                indexPatterns: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_index_patterns_read_user', {
          password: 'global_index_patterns_read_user-password',
          roles: ['global_index_patterns_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_index_patterns_read_user',
          'global_index_patterns_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );

        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
      });

      after(async () => {
        await security.role.delete('global_index_patterns_read_role');
        await security.user.delete('global_index_patterns_read_user');
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Stack Management']);
      });

      it(`index pattern listing doesn't show create button`, async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('noDataViewsPrompt');
        await testSubjects.missingOrFail('createDataViewButtonFlyout');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    describe('no data views privileges', () => {
      before(async () => {
        await security.role.create('no_index_patterns_privileges_role', {
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

        await security.user.create('no_index_patterns_privileges_user', {
          password: 'no_index_patterns_privileges_user-password',
          roles: ['no_index_patterns_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_index_patterns_privileges_user',
          'no_index_patterns_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_index_patterns_privileges_role');
        await security.user.delete('no_index_patterns_privileges_user');
      });

      it('does not show Management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`doesn't show Data Views in management side-nav`, async () => {
        await PageObjects.common.navigateToActualUrl('management', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('~appNotFoundPageContent');
      });
    });
  });
}
