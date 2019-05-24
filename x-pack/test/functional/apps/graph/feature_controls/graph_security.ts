/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SecurityService } from '../../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security: SecurityService = getService('security');
  const PageObjects = getPageObjects(['common', 'graph', 'security', 'error']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('security', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.forceLogout();
    });

    after(async () => {
      // logout, so the other tests don't accidentally run as the custom users we're testing below
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
        expect(navLinks.map((link: Record<string, string>) => link.text)).to.eql([
          'Graph',
          'Management',
        ]);
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('graph');
        await testSubjects.existOrFail('graphSaveButton');
      });

      it('shows delete button', async () => {
        await PageObjects.common.navigateToApp('graph');
        await testSubjects.existOrFail('graphDeleteButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
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
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Graph', 'Management']);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('graph');
        await testSubjects.existOrFail('graphOpenButton');
        await testSubjects.missingOrFail('graphSaveButton');
      });

      it(`doesn't show delete button`, async () => {
        await PageObjects.common.navigateToApp('graph');
        await testSubjects.existOrFail('graphOpenButton');
        await testSubjects.missingOrFail('graphDeleteButton');
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
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).not.to.contain('Graph');
      });

      it(`navigating to app displays a 404`, async () => {
        await PageObjects.common.navigateToUrl('graph', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        await PageObjects.error.expectNotFound();
      });
    });
  });
}
