/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const config = getService('config');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');
  const es = getService('legacyEs');

  describe('security', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('global index_patterns all privileges', () => {
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

      it(`index pattern empty shows create anyway link`, async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('createAnyway');
        // @ts-expect-error
        await es.transport.request({
          path: '/blogs/_doc',
          method: 'POST',
          body: { user: 'matt', message: 20 },
        });
        // await new Promise((r) => setTimeout(r, 300000));
        await testSubjects.click('refreshIndicesButton');
        await testSubjects.existOrFail('createIndexPatternButton', { timeout: 5000 });
        // test when there's an existing pattern
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });
    });

    describe('global index_patterns read-only privileges', () => {
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

      it(`index pattern empty page show create anyway link`, async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await testSubjects.missingOrFail('createAnyway');
        // @ts-expect-error
        await es.transport.request({
          path: '/blogs/_doc',
          method: 'POST',
          body: { user: 'matt', message: 20 },
        });
        await testSubjects.click('refreshIndicesButton');
        await testSubjects.missingOrFail('createIndexPatternButton', { timeout: 5000 });
        // test when there's an existing pattern
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    describe('no index_patterns privileges', () => {
      before(async () => {
        await security.role.create('no_index_patterns_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
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

      it('shows Management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Discover', 'Stack Management']);
      });

      it(`doesn't show Index Patterns in management side-nav`, async () => {
        await PageObjects.settings.navigateTo();
        await testSubjects.existOrFail('managementHome', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.missingOrFail('indexPatterns');
      });

      it(`does not allow navigation to Index Patterns; redirects to management home`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/indexPatterns', {
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
