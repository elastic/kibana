/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('security feature controls', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    describe('global all base privilege', () => {
      before(async () => {
        await security.role.create('global_all_role', {
          kibana: [
            {
              base: ['all'],
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_all_user', {
          password: 'global_all_user-password',
          roles: ['global_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login('global_all_user', 'global_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_all_role'),
          security.user.delete('global_all_user'),
          PageObjects.security.forceLogout(),
        ]);
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Stack Management');
      });

      it(`displays Spaces management section`, async () => {
        await PageObjects.settings.navigateTo();
        await testSubjects.existOrFail('spaces');
      });

      it(`can navigate to spaces grid page`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-grid-page');
      });

      it(`can navigate to create new space page`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-edit-page');
      });

      it(`can navigate to edit space page`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-edit-page');
      });
    });

    describe('default space all base privilege', () => {
      before(async () => {
        await security.role.create('default_space_all_role', {
          kibana: [
            {
              base: ['all'],
              spaces: ['default'],
            },
          ],
        });

        await security.user.create('default_space_all_user', {
          password: 'default_space_all_user-password',
          roles: ['default_space_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'default_space_all_user',
          'default_space_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await Promise.all([
          security.role.delete('default_space_all_role'),
          security.user.delete('default_space_all_user'),
          PageObjects.security.forceLogout(),
        ]);
      });

      it('shows management navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Stack Management');
      });

      it(`doesn't display Spaces management section`, async () => {
        await PageObjects.settings.navigateTo();
        await testSubjects.existOrFail('managementHome'); // this ensures we've gotten to the management page
        await testSubjects.missingOrFail('spaces');
      });

      it(`can't navigate to spaces grid page`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('managementHome');
      });

      it(`can't navigate to create new space page`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('managementHome');
      });

      it(`can't navigate to edit space page`, async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('managementHome');
      });
    });
  });
}
