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
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');

  describe('security feature controls', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await spaces.create({
        id: 'nondefaultspace',
        name: 'Non-default Space',
        disabledFeatures: [],
      });
    });

    after(async () => {
      await spaces.delete('nondefaultspace');
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
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
          expectSpaceSelector: true,
        });
        await testSubjects.click('space-card-default');
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_all_role'),
          security.user.delete('global_all_user'),
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
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('default_space_all_role'),
          security.user.delete('default_space_all_user'),
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

    // these tests are testing role specific privilege with non default space
    describe('Non default space and role specific privilege', () => {
      before(async () => {
        await security.role.create('nondefault_space_specific_role', {
          kibana: [
            {
              base: ['all'],
              spaces: ['nondefaultspace'],
            },
          ],
        });

        await security.user.create('nondefault_space_specific_user', {
          password: 'nondefault_space_specific_role-password',
          roles: ['nondefault_space_specific_role'],
          full_name: 'nondefaultspace_specific_user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'nondefault_space_specific_user',
          'nondefault_space_specific_role-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();

        await Promise.all([
          security.role.delete('nondefault_space_specific_role'),
          security.user.delete('nondefault_space_specific_user'),
        ]);
      });

      it('shows management navlink', async () => {
        await PageObjects.spaceSelector.expectHomePage('nondefaultspace');
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Stack Management');
      });

      it(`doesn't display spaces in the management section`, async () => {
        await PageObjects.common.navigateToApp('management', {
          basePath: '/s/nondefaultspace',
        });
        await testSubjects.missingOrFail('spaces');
      });
    });
  });
}
