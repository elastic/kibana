/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  createDashboardEditUrl,
  DashboardConstants,
} from '../../../../../../src/plugins/dashboard/public/dashboard_constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const config = getService('config');
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'security',
    'spaceSelector',
    'share',
    'error',
  ]);
  const appsMenu = getService('appsMenu');
  const panelActions = getService('dashboardPanelActions');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');

  describe('dashboard feature controls security', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/test/functional/es_archives/dashboard/feature_controls/security'
      );
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();

      await esArchiver.unload(
        'x-pack/test/functional/es_archives/dashboard/feature_controls/security'
      );
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

      it('only shows the dashboard navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link) => link.text)).to.eql([
          'Overview',
          'Dashboard',
          'Stack Management', // dashboard_all enables search sessions which enables 'Stack Management'
        ]);
      });

      it(`landing page shows "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`create new dashboard shows addNew button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('emptyDashboardWidget', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          createDashboardEditUrl('i-exist'),
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('embeddablePanelHeading-APie', {
          timeout: config.get('timeouts.waitFor'),
        });
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

      it('allows saving via the saved query management component popover with no saved query loaded', async () => {
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.saveNewQuery('foo', 'bar', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('foo');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();

        await savedQueryManagementComponent.deleteSavedQuery('foo');
        await savedQueryManagementComponent.savedQueryMissingOrFail('foo');
      });

      it('allow saving changes to a currently loaded query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'new description',
          true,
          false
        );
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:404');

        // Reset after changing
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery(
          'Ok responses for jpg files',
          true,
          false
        );
      });

      it('allow saving currently loaded query as a copy', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'ok2',
          'description',
          true,
          false
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('ok2');
        await savedQueryManagementComponent.deleteSavedQuery('ok2');
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
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Overview', 'Dashboard']);
      });

      it(`landing page doesn't show "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.missingOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`create new dashboard shows the read only warning`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardEmptyReadOnly', { timeout: 20000 });
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          createDashboardEditUrl('i-exist'),
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('embeddablePanelHeading-APie', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('does not allow copy to dashboard behaviour', async () => {
        await panelActions.expectMissingPanelAction('embeddablePanelAction-copyToDashboard');
      });

      it(`Permalinks doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlMissingOrFail();
        // close the menu
        await PageObjects.share.clickShareTopNavButton();
      });

      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    });

    describe('global dashboard read-only with url_create privileges', () => {
      before(async () => {
        await security.role.create('global_dashboard_read_url_create_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                dashboard: ['read', 'url_create'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_dashboard_read_url_create_user', {
          password: 'global_dashboard_read_url_create_user-password',
          roles: ['global_dashboard_read_url_create_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_dashboard_read_url_create_user',
          'global_dashboard_read_url_create_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_dashboard_read_url_create_role');
        await security.user.delete('global_dashboard_read_url_create_user');
      });

      it('shows dashboard navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Overview', 'Dashboard']);
      });

      it(`landing page doesn't show "Create new Dashboard" button`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardLandingPage', { timeout: 10000 });
        await testSubjects.missingOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`create new dashboard shows the read only warning`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('dashboardEmptyReadOnly', { timeout: 20000 });
      });

      it(`can view existing Dashboard`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          createDashboardEditUrl('i-exist'),
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('embeddablePanelHeading-APie', { timeout: 10000 });
      });

      it(`Permalinks shows create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlExistOrFail();
      });

      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/116881
    describe.skip('no dashboard privileges', () => {
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

      it(`landing page shows 403`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.LANDING_PAGE_PATH,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await PageObjects.error.expectForbidden();
      });

      it(`create new dashboard shows 403`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          DashboardConstants.CREATE_NEW_DASHBOARD_URL,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await PageObjects.error.expectForbidden();
      });

      it(`edit dashboard for object which doesn't exist shows 403`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          createDashboardEditUrl('i-dont-exist'),
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await PageObjects.error.expectForbidden();
      });

      it(`edit dashboard for object which exists shows 403`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'dashboard',
          createDashboardEditUrl('i-exist'),
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await PageObjects.error.expectForbidden();
      });
    });
  });
}
