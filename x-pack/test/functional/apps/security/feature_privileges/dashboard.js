/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
// eslint-disable-next-line max-len
import { DashboardConstants, createDashboardEditUrl } from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard/dashboard_constants';

export default function ({ getPageObjects, getService }) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  describe('dashboard', () => {
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

    describe('global dashboard all privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_all_role', {
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
          ]
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
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.eql([
          'Dashboard',
          'Management',
        ]);
      });

      it(`landing page shows "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.LANDING_PAGE_PATH, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('dashboardLandingPage', 10000);
        await testSubjects.existOrFail('newDashboardLink');
      });

      it(`create new dashboard shows addNew button`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('emptyDashboardAddPanelButton', 10000);
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('dashboardPanelHeading-APie', 10000);
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
          kibana: [
            {
              feature: {
                dashboard: ['read']
              },
              spaces: ['*']
            }
          ]
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
        const navLinks = (await appsMenu.readLinks()).map(link => link.text);
        expect(navLinks).to.eql([
          'Dashboard',
          'Management',
        ]);
      });

      it(`landing page doesn't show "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.LANDING_PAGE_PATH, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('dashboardLandingPage', 10000);
        await testSubjects.missingOrFail('newDashboardLink');
      });

      it(`create new dashboard redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });


      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('dashboardPanelHeading-APie', 10000);
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
          kibana: [
            {
              feature: {
                discover: ['all']
              },
              spaces: ['*']
            }
          ]
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

      it(`landing page redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.LANDING_PAGE_PATH, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`create new dashboard redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit dashboard for object which doesn't exist redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-dont-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit dashboard for object which exists redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
