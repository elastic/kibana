/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const securityService = getService('security');
  const { common, security, error, header } = getPageObjects([
    'common',
    'security',
    'error',
    'header',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('security', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      // ensure we're logged out so we can login as the appropriate users
      await security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await security.forceLogout();
    });

    describe('global graph all privileges', () => {
      before(async () => {
        await securityService.role.create('global_graph_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                graph: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_graph_all_user', {
          password: 'global_graph_all_user-password',
          roles: ['global_graph_all_role'],
          full_name: 'test user',
        });

        await security.login('global_graph_all_user', 'global_graph_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('global_graph_all_role');
        await securityService.user.delete('global_graph_all_user');
      });

      it('shows graph navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link) => link.text)).to.eql(['Graph', 'assetInventory']);
      });

      it('landing page shows "Create new graph" button', async () => {
        await common.navigateToApp('graph');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('graphLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('graphCreateGraphPromptButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it('allows creating a new workspace', async () => {
        await common.navigateToApp('graph');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.click('graphCreateGraphPromptButton');
        const breadcrumb = await testSubjects.find('~graphCurrentGraphBreadcrumb');
        expect(await breadcrumb.getVisibleText()).to.equal('Unsaved graph');
      });

      it('shows save button', async () => {
        await testSubjects.existOrFail('graphSaveButton');
      });
    });

    describe('global graph read-only privileges', () => {
      before(async () => {
        await securityService.role.create('global_graph_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                graph: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await securityService.user.create('global_graph_read_user', {
          password: 'global_graph_read_user-password',
          roles: ['global_graph_read_role'],
          full_name: 'test user',
        });

        await security.login('global_graph_read_user', 'global_graph_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('global_graph_read_role');
        await securityService.user.delete('global_graph_read_user');
      });

      it('shows graph navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Graph', 'assetInventory']);
      });

      it('does not show a "Create new Workspace" button', async () => {
        await common.navigateToApp('graph');
        await header.waitUntilLoadingHasFinished();
        await testSubjects.existOrFail('graphLandingPage', { timeout: 10000 });
        await testSubjects.missingOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    describe('no graph privileges', () => {
      before(async () => {
        await securityService.role.create('no_graph_privileges_role', {
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

        await securityService.user.create('no_graph_privileges_user', {
          password: 'no_graph_privileges_user-password',
          roles: ['no_graph_privileges_role'],
          full_name: 'test user',
        });

        await security.login('no_graph_privileges_user', 'no_graph_privileges_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('no_graph_privileges_role');
        await securityService.user.delete('no_graph_privileges_user');
      });

      it(`doesn't show graph navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Graph');
      });

      it(`navigating to app displays a 403`, async () => {
        await common.navigateToUrl('graph', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        await error.expectForbidden();
      });
    });
  });
}
