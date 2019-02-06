/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'discover', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('discover', () => {
    before(async () => {
      await esArchiver.load('security/feature_privileges');
      await kibanaServer.uiSettings.replace({
        "accessibility:disableAnimations": true,
        "telemetry:optIn": false,
        "defaultIndex": "logstash-*",
      });
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('security/feature_privileges');
    });

    describe('global discover all privileges', () => {
      before(async () => {
        await security.role.create('global_discover_all_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: [
            {
              feature: {
                discover: ['all']
              },
              spaces: ['*']
            }
          ]
        });

        await security.user.create('global_discover_all_user', {
          password: 'global_discover_all_user-password',
          roles: ['global_discover_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_discover_all_user', 'global_discover_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_discover_all_role');
        await security.user.delete('global_discover_all_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.eql([
          'Discover',
          'Management',
        ]);
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverSaveButton', 20000);
      });
    });

    describe('global discover read-only privileges', () => {
      before(async () => {
        await security.role.create('global_discover_read_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: [
            {
              feature: {
                discover: ['read']
              },
              spaces: ['*']
            }
          ]
        });

        await security.user.create('global_discover_read_user', {
          password: 'global_discover_read_user-password',
          roles: ['global_discover_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_discover_read_user', 'global_discover_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_discover_read_role');
        await security.user.delete('global_discover_read_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.eql([
          'Discover',
          'Management',
        ]);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverNewButton', 10000);
        await testSubjects.missingOrFail('discoverSaveButton');
      });
    });

    describe('no discover privileges', () => {
      before(async () => {
        await security.role.create('no_discover_privileges_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: [
            {
              feature: {
                dashboard: ['all']
              },
              spaces: ['*']
            }
          ],
        });

        await security.user.create('no_discover_privileges_user', {
          password: 'no_discover_privileges_user-password',
          roles: ['no_discover_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('no_discover_privileges_user', 'no_discover_privileges_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('no_discover_privileges_role');
        await security.user.delete('no_discover_privileges_user');
      });

      it(`redirects to the home page`, async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          ensureCurrentUrl: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
