/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const securityService = getService('security');
  const { common, canvas, error, security } = getPageObjects([
    'common',
    'canvas',
    'error',
    'security',
  ]);
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const archive = 'x-pack/test/functional/fixtures/kbn_archiver/canvas/default';

  describe('security feature controls', function () {
    this.tags(['skipFirefox']);

    before(async () => kibanaServer.importExport.load(archive));

    after(async () => await kibanaServer.importExport.unload(archive));

    describe('global canvas all privileges', () => {
      before(async () => {
        await securityService.role.create('global_canvas_all_role', {
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

        await securityService.user.create('global_canvas_all_user', {
          password: 'global_canvas_all_user-password',
          roles: ['global_canvas_all_role'],
          full_name: 'test user',
        });

        await security.forceLogout();

        await security.login('global_canvas_all_user', 'global_canvas_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();
        await Promise.all([
          securityService.role.delete('global_canvas_all_role'),
          securityService.user.delete('global_canvas_all_user'),
        ]);
      });

      it('shows canvas navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Canvas', 'Stack Management']); // access to the Reporting feature grants access to Stack Management
      });

      it(`landing page shows "Create new workpad" button`, async () => {
        await common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await canvas.expectCreateWorkpadButtonEnabled();
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`allows a workpad to be created`, async () => {
        await common.navigateToActualUrl('canvas');

        await testSubjects.click('create-workpad-button');

        await canvas.expectAddElementButton();
      });

      it(`allows a workpad to be edited`, async () => {
        await common.navigateToActualUrl(
          'canvas',
          '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          }
        );

        await canvas.expectAddElementButton();
      });
    });

    describe('global canvas read-only privileges', () => {
      before(async () => {
        await securityService.role.create('global_canvas_read_role', {
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

        await securityService.user.create('global_canvas_read_user', {
          password: 'global_canvas_read_user-password',
          roles: ['global_canvas_read_role'],
          full_name: 'test user',
        });

        await security.login('global_canvas_read_user', 'global_canvas_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('global_canvas_read_role');
        await securityService.user.delete('global_canvas_read_user');
      });

      it('shows canvas navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Canvas']);
      });

      it(`landing page shows disabled "Create new workpad" button`, async () => {
        await common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await canvas.expectCreateWorkpadButtonDisabled();
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`does not allow a workpad to be created`, async () => {
        await common.navigateToActualUrl('canvas', 'workpad/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });

        // expect redirection to canvas landing
        await canvas.expectCreateWorkpadButtonDisabled();
      });

      it(`does not allow a workpad to be edited`, async () => {
        await common.navigateToActualUrl(
          'canvas',
          '/workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31',
          {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          }
        );

        await canvas.expectNoAddElementButton();
      });
    });

    describe('no canvas privileges', () => {
      before(async () => {
        await securityService.role.create('no_canvas_privileges_role', {
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

        await securityService.user.create('no_canvas_privileges_user', {
          password: 'no_canvas_privileges_user-password',
          roles: ['no_canvas_privileges_role'],
          full_name: 'test user',
        });

        await security.login('no_canvas_privileges_user', 'no_canvas_privileges_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await securityService.role.delete('no_canvas_privileges_role');
        await securityService.user.delete('no_canvas_privileges_user');
      });

      it(`returns a 403`, async () => {
        await common.navigateToActualUrl('canvas', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await error.expectForbidden();
      });

      it(`create new workpad returns a 403`, async () => {
        await common.navigateToActualUrl('canvas', 'workpad/create', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await error.expectForbidden();
      });
    });
  });
}
