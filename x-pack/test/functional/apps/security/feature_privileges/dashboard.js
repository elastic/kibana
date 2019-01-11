/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';

export default function ({ getPageObjects, getService }) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  describe('dashboard', () => {
    before(async () => {
      await esArchiver.load('security/feature_privileges');
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('security/feature_privileges');
    });

    describe('global dashboard all privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_all_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: {
            global: {
              feature: {
                dashboard: ['all']
              },
            }
          }
        });

        await security.user.create('global_dashboard_all_user', {
          password: 'global_dashboard_all_user-password',
          roles: ['global_dashboard_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_dashboard_all_user', 'global_dashboard_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_dashboard_all_role');
        await security.user.delete('global_dashboard_all_user');
      });

      it('shows dashboard navlink', async () => {
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.eql([
          'Dashboard',
          'Management',
        ]);
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await testSubjects.existOrFail('dashboardSaveButton', 20000);
      });
    });

    describe('global dashboard read-only privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_read_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: {
            global: {
              feature: {
                dashboard: ['read']
              },
            }
          }
        });

        await security.user.create('global_dashboard_read_user', {
          password: 'global_dashboard_read_user-password',
          roles: ['global_dashboard_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_dashboard_read_user', 'global_dashboard_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_dashboard_read_role');
        await security.user.delete('global_dashboard_read_user');
      });

      it('shows dashboard navlink', async () => {
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.eql([
          'Dashboard',
          'Management',
        ]);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await testSubjects.existOrFail('dashboardNewButton', 10000);
        await testSubjects.missingOrFail('dashboardSaveButton');
      });
    });

    describe('no dashboard privileges', () => {
      before(async () => {
        await security.role.create('no_dashboard_privileges_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: {
            global: {
              feature: {
                discover: ['all']
              }
            }
          }
        });

        await security.user.create('no_dashboard_privileges_user', {
          password: 'no_dashboard_privileges_user-password',
          roles: ['no_dashboard_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('no_dashboard_privileges_user', 'no_dashboard_privileges_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('no_dashboard_privileges_role');
        await security.user.delete('no_dashboard_privileges_user');
      });

      it(`redirects to the home page`, async () => {
        await PageObjects.common.navigateToUrl('dashboard', '', {
          ensureCurrentUrl: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
