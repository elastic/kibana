/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'canvas', 'security', 'spaceSelector']);
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('security feature controls', function () {
    this.tags(['skipFirefox']);
    before(async () => {
      await esArchiver.load('canvas/default');
    });

    after(async () => {
      await esArchiver.unload('canvas/default');
    });

    describe('global canvas all privileges', () => {
      before(async () => {
        await security.role.create('global_canvas_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                canvas: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_canvas_all_user', {
          password: 'global_canvas_all_user-password',
          roles: ['global_canvas_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_canvas_all_user',
          'global_canvas_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_canvas_all_role'),
          security.user.delete('global_canvas_all_user'),
        ]);
      });

      it('shows canvas navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Canvas', 'Stack Management']);
      });

      it(`landing page shows "Create new workpad" button`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.canvas.expectCreateWorkpadButtonEnabled();
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`allows a workpad to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/create', {
          ensureCurrentUrl: true,
          shouldLoginIfPrompted: false,
        });

        await PageObjects.canvas.expectAddElementButton();
      });

      it(`allows a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'canvas',
          'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          }
        );

        await PageObjects.canvas.expectAddElementButton();
      });
    });

    describe('global canvas read-only privileges', () => {
      before(async () => {
        await security.role.create('global_canvas_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                canvas: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_canvas_read_user', {
          password: 'global_canvas_read_user-password',
          roles: ['global_canvas_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_canvas_read_user',
          'global_canvas_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_canvas_read_role');
        await security.user.delete('global_canvas_read_user');
      });

      it('shows canvas navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Canvas', 'Stack Management']);
      });

      it(`landing page shows disabled "Create new workpad" button`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.canvas.expectCreateWorkpadButtonDisabled();
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`does not allow a workpad to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        // expect redirection to canvas landing
        await PageObjects.canvas.expectCreateWorkpadButtonDisabled();
      });

      it(`does not allow a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'canvas',
          'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          }
        );

        await PageObjects.canvas.expectNoAddElementButton();
      });
    });

    describe('no canvas privileges', () => {
      before(async () => {
        await security.role.create('no_canvas_privileges_role', {
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

        await security.user.create('no_canvas_privileges_user', {
          password: 'no_canvas_privileges_user-password',
          roles: ['no_canvas_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_canvas_privileges_user',
          'no_canvas_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_canvas_privileges_role');
        await security.user.delete('no_canvas_privileges_user');
      });

      it(`returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
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

      it(`create new workpad returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/create', {
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
