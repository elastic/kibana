/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'error', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('security', () => {
    before(async () => {
      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    describe('global apm all privileges', () => {
      before(async () => {
        await security.role.create('global_apm_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                apm: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_apm_all_user', {
          password: 'global_apm_all_user-password',
          roles: ['global_apm_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_apm_all_user', 'global_apm_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_apm_all_role');
        await security.user.delete('global_apm_all_user');
      });

      it('shows apm navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link) => link.text)).to.eql([
          'Overview',
          'Alerts',
          'Rules',
          'APM',
          'User Experience',
          'Stack Management',
        ]);
      });

      it('can navigate to APM app', async () => {
        await PageObjects.common.navigateToApp('apm');
        await testSubjects.existOrFail('apmMainContainer', {
          timeout: 10000,
        });
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });
    });

    describe('global apm read-only privileges', () => {
      before(async () => {
        await security.role.create('global_apm_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                apm: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_apm_read_user', {
          password: 'global_apm_read_user-password',
          roles: ['global_apm_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_apm_read_user', 'global_apm_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_apm_read_role');
        await security.user.delete('global_apm_read_user');
      });

      it('shows apm navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql([
          'Overview',
          'Alerts',
          'Rules',
          'APM',
          'User Experience',
          'Stack Management',
        ]);
      });

      it('can navigate to APM app', async () => {
        await PageObjects.common.navigateToApp('apm');
        await testSubjects.existOrFail('apmMainContainer', {
          timeout: 10000,
        });
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/122001
    describe.skip('no apm privileges', () => {
      before(async () => {
        await security.role.create('no_apm_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                dashboard: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_apm_privileges_user', {
          password: 'no_apm_privileges_user-password',
          roles: ['no_apm_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_apm_privileges_user',
          'no_apm_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_apm_privileges_role');
        await security.user.delete('no_apm_privileges_user');
      });

      it(`doesn't show APM navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('APM');
      });

      it(`renders no permission page`, async () => {
        await PageObjects.common.navigateToUrl('apm', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.error.expectForbidden();
      });
    });
  });
}
