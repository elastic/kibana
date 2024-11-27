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
  const securityService = getService('security');
  const { common, settings, security } = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');

  describe('security', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('global data views all privileges', () => {
      before(async () => {
        await securityService.role.create('global_index_patterns_all_role', {
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

        await securityService.user.create('global_index_patterns_all_user', {
          password: 'global_index_patterns_all_user-password',
          roles: ['global_index_patterns_all_role'],
          full_name: 'test user',
        });

        await security.forceLogout();

        await security.login(
          'global_index_patterns_all_user',
          'global_index_patterns_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );

        await kibanaServer.uiSettings.replace({});
        await settings.navigateTo();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await Promise.all([
          securityService.role.delete('global_index_patterns_all_role'),
          securityService.user.delete('global_index_patterns_all_user'),
        ]);
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Stack Management']);
      });

      it(`index pattern listing shows create button`, async () => {
        await settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('createDataViewButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });
    });

    describe('global data views read-only privileges', () => {
      before(async () => {
        await securityService.role.create('global_index_patterns_read_role', {
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

        await securityService.user.create('global_index_patterns_read_user', {
          password: 'global_index_patterns_read_user-password',
          roles: ['global_index_patterns_read_role'],
          full_name: 'test user',
        });

        await security.login(
          'global_index_patterns_read_user',
          'global_index_patterns_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );

        await kibanaServer.uiSettings.replace({});
        await settings.navigateTo();
      });

      after(async () => {
        await securityService.role.delete('global_index_patterns_read_role');
        await securityService.user.delete('global_index_patterns_read_user');
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Stack Management']);
      });

      it(`index pattern listing shows disabled create button`, async () => {
        await settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('noDataViewsPrompt');
        const createDataViewButton = await testSubjects.find('createDataViewButton');
        const isDisabled = await createDataViewButton.getAttribute('disabled');
        expect(isDisabled).to.be('true');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    describe('no data views privileges', () => {
      before(async () => {
        await securityService.role.create('no_index_patterns_privileges_role', {
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

        await securityService.user.create('no_index_patterns_privileges_user', {
          password: 'no_index_patterns_privileges_user-password',
          roles: ['no_index_patterns_privileges_role'],
          full_name: 'test user',
        });

        await security.login(
          'no_index_patterns_privileges_user',
          'no_index_patterns_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await securityService.role.delete('no_index_patterns_privileges_role');
        await securityService.user.delete('no_index_patterns_privileges_user');
      });

      it('does not show Management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover']);
      });

      it(`doesn't show Data Views in management side-nav`, async () => {
        await common.navigateToActualUrl('management', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('~appNotFoundPageContent');
      });
    });
  });
}
