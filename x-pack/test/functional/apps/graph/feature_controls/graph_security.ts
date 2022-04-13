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
  const PageObjects = getPageObjects(['common', 'graph', 'security', 'error']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  // FLAKY https://github.com/elastic/kibana/issues/109564
  describe.skip('security', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await PageObjects.security.forceLogout();
    });

    describe('global graph all privileges', () => {
      before(async () => {
        await security.role.create('global_graph_all_role', {
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

        await security.user.create('global_graph_all_user', {
          password: 'global_graph_all_user-password',
          roles: ['global_graph_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_graph_all_user',
          'global_graph_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_graph_all_role');
        await security.user.delete('global_graph_all_user');
      });

      it('shows graph navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link) => link.text)).to.eql(['Graph']);
      });

      it('landing page shows "Create new graph" button', async () => {
        await PageObjects.common.navigateToApp('graph');
        await testSubjects.existOrFail('graphLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('graphCreateGraphPromptButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it('allows creating a new workspace', async () => {
        await PageObjects.common.navigateToApp('graph');
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
        await security.role.create('global_graph_read_role', {
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

        await security.user.create('global_graph_read_user', {
          password: 'global_graph_read_user-password',
          roles: ['global_graph_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_graph_read_user',
          'global_graph_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_graph_read_role');
        await security.user.delete('global_graph_read_user');
      });

      it('shows graph navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Graph']);
      });

      it('does not show a "Create new Workspace" button', async () => {
        await PageObjects.common.navigateToApp('graph');
        await testSubjects.existOrFail('graphLandingPage', { timeout: 10000 });
        await testSubjects.missingOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });
    });

    describe('no graph privileges', () => {
      before(async () => {
        await security.role.create('no_graph_privileges_role', {
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

        await security.user.create('no_graph_privileges_user', {
          password: 'no_graph_privileges_user-password',
          roles: ['no_graph_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_graph_privileges_user',
          'no_graph_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_graph_privileges_role');
        await security.user.delete('no_graph_privileges_user');
      });

      it(`doesn't show graph navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).not.to.contain('Graph');
      });

      it(`navigating to app displays a 403`, async () => {
        await PageObjects.common.navigateToUrl('graph', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        await PageObjects.error.expectForbidden();
      });
    });
  });
}
