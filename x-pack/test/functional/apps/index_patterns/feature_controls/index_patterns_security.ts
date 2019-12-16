/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');

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

        await security.logout();

        await security.loginAs({
          username: 'global_index_patterns_all_user',
          password: 'global_index_patterns_all_user-password',
        });

        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_index_patterns_all_role'),
          security.user.delete('global_index_patterns_all_user'),
          security.logout(),
        ]);
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Management']);
      });

      it(`index pattern listing shows create button`, async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('createIndexPatternButton');
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

        await security.loginAs({
          username: 'global_index_patterns_read_user',
          password: 'global_index_patterns_read_user-password',
        });

        await kibanaServer.uiSettings.replace({});
        await PageObjects.settings.navigateTo();
      });

      after(async () => {
        await security.role.delete('global_index_patterns_read_role');
        await security.user.delete('global_index_patterns_read_user');
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Management']);
      });

      it(`index pattern listing doesn't show create button`, async () => {
        await PageObjects.settings.clickKibanaIndexPatterns();
        await testSubjects.existOrFail('indexPatternTable');
        await testSubjects.missingOrFail('createIndexPatternButton');
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

        await security.loginAs({
          username: 'no_index_patterns_privileges_user',
          password: 'no_index_patterns_privileges_user-password',
        });
      });

      after(async () => {
        await security.role.delete('no_index_patterns_privileges_role');
        await security.user.delete('no_index_patterns_privileges_user');
      });

      it('shows Management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Discover', 'Management']);
      });

      it(`doesn't show Index Patterns in management side-nav`, async () => {
        await PageObjects.settings.navigateTo();
        await testSubjects.existOrFail('kibana');
        await testSubjects.missingOrFail('index_patterns');
      });

      it(`does not allow navigation to Index Patterns; redirects to Kibana home`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', 'management/kibana/index_patterns', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', { timeout: 10000 });
      });
    });
  });
}
