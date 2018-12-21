/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';

const getAlwaysPresentNavLinks = (usersFullName) => {
  return [
    usersFullName,
    'Logout',
    'Collapse',
  ];
};

export default function ({ getPageObjects, getService }) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'discover', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  const expectAppNavLinks = async (appNavLinkTexts) => {
    const appLinks = await testSubjects.findAll('appLink');
    const linksText = await Promise.all(appLinks.map(appLink => appLink.getVisibleText()));
    expect(linksText).to.eql([
      ...appNavLinkTexts,
      ...getAlwaysPresentNavLinks('test user')
    ]);
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
  });
}
