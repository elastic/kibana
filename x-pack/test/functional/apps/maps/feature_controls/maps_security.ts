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
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'maps']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');
  const globalNav = getService('globalNav');

  describe('security feature controls', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('maps/data');
      await esArchiver.load('maps/kibana');
    });

    after(async () => {
      await esArchiver.unload('maps/kibana');
    });

    describe('global maps all privileges', () => {
      before(async () => {
        await security.role.create('global_maps_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                maps: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_maps_all_user', {
          password: 'global_maps_all_user-password',
          roles: ['global_maps_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.logout();

        await PageObjects.security.login('global_maps_all_user', 'global_maps_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_maps_all_role'),
          security.user.delete('global_maps_all_user'),
          PageObjects.security.logout(),
        ]);
      });

      it('shows maps navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Maps', 'Management']);
      });

      it(`allows a map to be created`, async () => {
        await PageObjects.maps.openNewMap();
        await PageObjects.maps.expectExistAddLayerButton();
        await PageObjects.maps.saveMap('my test map');
      });

      it(`allows a map to be deleted`, async () => {
        await PageObjects.maps.deleteSavedMaps('my test map');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });
    });

    describe('global maps read-only privileges', () => {
      before(async () => {
        await security.role.create('global_maps_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                maps: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_maps_read_user', {
          password: 'global_maps_read_user-password',
          roles: ['global_maps_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_maps_read_user',
          'global_maps_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_maps_read_role');
        await security.user.delete('global_maps_read_user');
      });

      it('shows Maps navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Maps', 'Management']);
      });

      it(`does not show create new button`, async () => {
        await PageObjects.maps.gotoMapListingPage();
        await PageObjects.maps.expectMissingCreateNewButton();
      });

      it(`does not allow a map to be deleted`, async () => {
        await PageObjects.maps.gotoMapListingPage();
        await testSubjects.missingOrFail('checkboxSelectAll');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      describe('existing map', () => {
        before(async () => {
          await PageObjects.maps.loadSavedMap('document example');
        });

        it(`can't save`, async () => {
          await PageObjects.maps.expectMissingSaveButton();
        });

        it(`can't add layer`, async () => {
          await PageObjects.maps.expectMissingAddLayerButton();
        });
      });
    });

    describe('no maps privileges', () => {
      before(async () => {
        await security.role.create('no_maps_privileges_role', {
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

        await security.user.create('no_maps_privileges_user', {
          password: 'no_maps_privileges_user-password',
          roles: ['no_maps_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_maps_privileges_user',
          'no_maps_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_maps_privileges_role');
        await security.user.delete('no_maps_privileges_user');
      });

      it('does not show Maps navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Discover', 'Management']);
      });

      it(`returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('maps', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        const messageText = await PageObjects.common.getBodyText();
        expect(messageText).to.eql(
          JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          })
        );
      });
    });
  });
}
