/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects([
    'common',
    'visualize',
    'header',
    'security',
    'share',
    'spaceSelector',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('feature controls security', () => {
    before(async () => {
      await esArchiver.load('visualize/default');
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('visualize/default');
    });

    describe('global visualize all privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_all_user', {
          password: 'global_visualize_all_user-password',
          roles: ['global_visualize_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.logout();

        await PageObjects.security.login(
          'global_visualize_all_user',
          'global_visualize_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.logout();
        await security.role.delete('global_visualize_all_role');
        await security.user.delete('global_visualize_all_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Visualize', 'Management']);
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizeLandingPage', 10000);
        await testSubjects.existOrFail('newItemButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', '/visualize/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', 10000);
      });

      it('can save existing Visualization', async () => {
        await PageObjects.common.navigateToActualUrl('kibana', '/visualize/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizeSaveButton', 10000);
      });

      it('Embed code shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Embedcode');
        await PageObjects.share.createShortUrlExistOrFail();
      });

      it('Permalinks shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlExistOrFail();
      });
    });

    describe('global visualize read-only privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_read_user', {
          password: 'global_visualize_read_user-password',
          roles: ['global_visualize_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_visualize_read_user',
          'global_visualize_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.logout();
        await security.role.delete('global_visualize_read_role');
        await security.user.delete('global_visualize_read_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Visualize', 'Management']);
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizeLandingPage', 10000);
        await testSubjects.existOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/visualize/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', 10000);
      });

      it(`can't save existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/visualize/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('shareTopNavButton', 10000);
        await testSubjects.missingOrFail('visualizeSaveButton', 10000);
      });

      it(`Embed Code doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Embedcode');
        await PageObjects.share.createShortUrlMissingOrFail();
      });

      it(`Permalinks doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlMissingOrFail();
      });
    });

    describe('no visualize privileges', () => {
      before(async () => {
        await security.role.create('no_visualize_privileges_role', {
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

        await security.user.create('no_visualize_privileges_user', {
          password: 'no_visualize_privileges_user-password',
          roles: ['no_visualize_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_visualize_privileges_user',
          'no_visualize_privileges_user-password',
          {
            expectSpaceSelector: false,
            shouldLoginIfPrompted: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.logout();
        await security.role.delete('no_visualize_privileges_role');
        await security.user.delete('no_visualize_privileges_user');
      });

      it(`landing page redirects to home page`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit page redirects to home page`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/visualize/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
