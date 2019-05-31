/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
// eslint-disable-next-line max-len
import {
  createDashboardEditUrl,
  DashboardConstants,
} from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard/dashboard_constants';
import { SecurityService } from '../../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security: SecurityService = getService('security');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'spaceSelector', 'share']);
  const appsMenu = getService('appsMenu');
  const panelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');

  describe('dashboard security', () => {
    before(async () => {
      await esArchiver.load('dashboard/feature_controls/security');
      await esArchiver.loadIfNeeded('logstash_functional');

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      await esArchiver.unload('dashboard/feature_controls/security');

      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await PageObjects.security.forceLogout();
    });

    describe('global dashboard all privileges, no embeddable application privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_all_role', {
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

        await security.user.create('global_dashboard_all_user', {
          password: 'global_dashboard_all_user-password',
          roles: ['global_dashboard_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_dashboard_all_user',
          'global_dashboard_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_dashboard_all_role');
        await security.user.delete('global_dashboard_all_user');
      });

      it('shows dashboard navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link: Record<string, string>) => link.text)).to.eql([
          'Dashboard',
          'Management',
        ]);
      });

      it(`landing page shows "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardLandingPage', 10000);
        await testSubjects.existOrFail('newItemButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`create new dashboard shows addNew button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('emptyDashboardAddPanelButton', 10000);
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('dashboardPanelHeading-APie', 10000);
      });

      it(`does not allow a visualization to be edited`, async () => {
        await PageObjects.dashboard.gotoDashboardEditMode('A Dashboard');
        await panelActions.openContextMenu();
        await panelActions.expectMissingEditPanelAction();
      });

      it(`Permalinks shows create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlExistOrFail();
      });

      it(`does not allow a map to be edited`, async () => {
        await PageObjects.dashboard.gotoDashboardEditMode('dashboard with map');
        await panelActions.openContextMenu();
        await panelActions.expectMissingEditPanelAction();
      });
    });

    describe('global dashboard & embeddable all privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_visualize_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                dashboard: ['all'],
                visualize: ['all'],
                maps: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_dashboard_visualize_all_user', {
          password: 'global_dashboard_visualize_all_user-password',
          roles: ['global_dashboard_visualize_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_dashboard_visualize_all_user',
          'global_dashboard_visualize_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_dashboard_visualize_all_role');
        await security.user.delete('global_dashboard_visualize_all_user');
      });

      it(`allows a visualization to be edited`, async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardEditMode('A Dashboard');
        await panelActions.openContextMenu();
        await panelActions.expectExistsEditPanelAction();
      });

      it(`allows a map to be edited`, async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.gotoDashboardEditMode('dashboard with map');
        await panelActions.openContextMenu();
        await panelActions.expectExistsEditPanelAction();
      });
    });

    describe('global dashboard read-only privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                dashboard: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_dashboard_read_user', {
          password: 'global_dashboard_read_user-password',
          roles: ['global_dashboard_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_dashboard_read_user',
          'global_dashboard_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_dashboard_read_role');
        await security.user.delete('global_dashboard_read_user');
      });

      it('shows dashboard navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Dashboard', 'Management']);
      });

      it(`landing page doesn't show "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardLandingPage', 10000);
        await testSubjects.missingOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`create new dashboard redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', 20000);
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('dashboardPanelHeading-APie', 10000);
      });

      it(`Permalinks doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlMissingOrFail();
      });
    });

    describe('no dashboard privileges', () => {
      before(async () => {
        await security.role.create('no_dashboard_privileges_role', {
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

        await security.user.create('no_dashboard_privileges_user', {
          password: 'no_dashboard_privileges_user-password',
          roles: ['no_dashboard_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_dashboard_privileges_user',
          'no_dashboard_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_dashboard_privileges_role');
        await security.user.delete('no_dashboard_privileges_user');
      });

      it(`doesn't show dashboard navLink`, async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((navLink: any) => navLink.text)).to.not.contain(['Dashboard']);
      });

      it(`landing page redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`create new dashboard redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('homeApp', 20000);
      });

      it(`edit dashboard for object which doesn't exist redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'kibana',
          createDashboardEditUrl('i-dont-exist'),
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
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
