/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'discover', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  const expectAppNavLinks = async (appNavLinkTexts) => {
    const appSwitcher = await testSubjects.find('appSwitcher');
    const appLinks = await testSubjects.findAllDescendant('appLink', appSwitcher);
    const linksText = await Promise.all(appLinks.map(appLink => appLink.getVisibleText()));
    expect(linksText).to.eql(appNavLinkTexts);
  };

  describe('discover', () => {
    before(async () => {
      await esArchiver.load('security/feature_privileges');
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
          kibana: {
            global: {
              feature: {
                discover: ['all']
              },
            }
          }
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
        await expectAppNavLinks([
          'Discover',
          'Management',
        ]);
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverSaveButton');
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
          kibana: {
            global: {
              feature: {
                discover: ['read']
              },
            }
          }
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
        await expectAppNavLinks([
          'Discover',
          'Management',
        ]);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverNewButton');
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
          kibana: {
            global: {
              feature: {
                dashboard: ['all']
              }
            }
          }
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
        await PageObjects.common.navigateToUrl('discover');
        await testSubjects.existOrFail('homeApp');
      });
    });
  });
}
