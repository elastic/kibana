/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { KibanaFunctionalTestDefaultProviders } from 'x-pack/test/types/providers';

// tslint:disable no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'canvas', 'security', 'spaceSelector']);
  const find = getService('find');

  describe('canvas', () => {
    before(async () => {
      await esArchiver.load('security/feature_privileges');
      await kibanaServer.uiSettings.replace({
        'accessibility:disableAnimations': true,
        'telemetry:optIn': false,
        defaultIndex: 'logstash-*',
      });
    });

    after(async () => {
      await esArchiver.unload('security/feature_privileges');
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

        await PageObjects.security.login(
          'global_canvas_all_user',
          'global_canvas_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_canvas_all_role');
        await security.user.delete('global_canvas_all_user');
      });

      it('shows canvas navlink', async () => {
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.eql(['Canvas', 'Management']);
      });

      it(`landing page shows "Create new workpad" button`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.canvas.expectCreateWorkpadButtonEnabled();
      });

      it(`allows a workpad to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/create', {
          ensureCurrentUrl: true,
          showLoginIfPrompted: false,
        });

        await PageObjects.canvas.expectAddElementButton();
      });

      it(`allows a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'canvas',
          'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            showLoginIfPrompted: false,
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
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.eql(['Canvas', 'Management']);
      });

      it(`landing page shows disabled "Create new workpad" button`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.canvas.expectCreateWorkpadButtonDisabled();
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
            shouldLoginIfPrompted: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_canvas_privileges_role');
        await security.user.delete('no_canvas_privileges_user');
      });

      const getMessageText = async () =>
        await (await find.byCssSelector('body>pre')).getVisibleText();

      it(`returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        const messageText = await getMessageText();
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
        const messageText = await getMessageText();
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
