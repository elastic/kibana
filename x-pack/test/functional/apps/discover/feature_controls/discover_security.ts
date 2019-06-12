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
  const globalNav = getService('globalNav');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'timePicker',
    'security',
    'share',
    'spaceSelector',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  async function setDiscoverTimeRange() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
  }

  describe('security', () => {
    before(async () => {
      await esArchiver.load('discover/feature_controls/security');
      await esArchiver.loadIfNeeded('logstash_functional');

      // ensure we're logged out so we can login as the appropriate users
      await PageObjects.security.logout();
    });

    after(async () => {
      await esArchiver.unload('discover/feature_controls/security');

      // logout, so the other tests don't accidentally run as the custom users we're testing below
      await PageObjects.security.logout();
    });

    describe('global discover all privileges', () => {
      before(async () => {
        await security.role.create('global_discover_all_role', {
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

        await security.user.create('global_discover_all_user', {
          password: 'global_discover_all_user-password',
          roles: ['global_discover_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_all_user',
          'global_discover_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_discover_all_role');
        await security.user.delete('global_discover_all_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = await appsMenu.readLinks();
        expect(navLinks.map((link: Record<string, string>) => link.text)).to.eql([
          'Discover',
          'Management',
        ]);
      });

      it('shows save button', async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverSaveButton', 20000);
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it('Permalinks shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlExistOrFail();
      });
    });

    describe('global discover read-only privileges', () => {
      before(async () => {
        await security.role.create('global_discover_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_discover_read_user', {
          password: 'global_discover_read_user-password',
          roles: ['global_discover_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_read_user',
          'global_discover_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_discover_read_role');
        await security.user.delete('global_discover_read_user');
      });

      it('shows discover navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Discover', 'Management']);
      });

      it(`doesn't show save button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await testSubjects.existOrFail('discoverNewButton', 10000);
        await testSubjects.missingOrFail('discoverSaveButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`doesn't show visualize button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await setDiscoverTimeRange();
        await PageObjects.discover.clickFieldListItem('bytes');
        await PageObjects.discover.expectMissingFieldListItemVisualize('bytes');
      });

      it(`Permalinks doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlMissingOrFail();
      });
    });

    describe('discover and visualize privileges', () => {
      before(async () => {
        await security.role.create('global_discover_visualize_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['read'],
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_discover_visualize_read_user', {
          password: 'global_discover_visualize_read_user-password',
          roles: ['global_discover_visualize_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_discover_visualize_read_user',
          'global_discover_visualize_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_discover_visualize_read_role');
        await security.user.delete('global_discover_visualize_read_user');
      });

      it(`shows the visualize button`, async () => {
        await PageObjects.common.navigateToApp('discover');
        await setDiscoverTimeRange();
        await PageObjects.discover.clickFieldListItem('bytes');
        await PageObjects.discover.expectFieldListItemVisualize('bytes');
      });
    });

    describe('no discover privileges', () => {
      before(async () => {
        await security.role.create('no_discover_privileges_role', {
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

        await security.user.create('no_discover_privileges_user', {
          password: 'no_discover_privileges_user-password',
          roles: ['no_discover_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_discover_privileges_user',
          'no_discover_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_discover_privileges_role');
        await security.user.delete('no_discover_privileges_user');
      });

      it(`redirects to the home page`, async () => {
        await PageObjects.common.navigateToUrl('discover', '', {
          ensureCurrentUrl: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
