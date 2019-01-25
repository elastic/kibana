/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
// eslint-disable-next-line max-len
import { DashboardConstants, createDashboardEditUrl } from '../../../../../../src/legacy/core_plugins/kibana/public/dashboard/dashboard_constants';

export default function ({ getPageObjects, getService }) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'canvas', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');

  describe('canvas', () => {
    before(async () => {
      await esArchiver.load('security/feature_privileges');
      await kibanaServer.uiSettings.replace({
        "accessibility:disableAnimations": true,
        "telemetry:optIn": false,
        "defaultIndex": "logstash-*",
      });
    });

    after(async () => {
      await esArchiver.unload('security/feature_privileges');
    });

    describe('global canvas all privileges', () => {
      before(async () => {
        await security.role.create('global_canvas_all_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: [
            {
              feature: {
                canvas: ['all']
              },
              spaces: ['*']
            }
          ]
        });

        await security.user.create('global_canvas_all_user', {
          password: 'global_canvas_all_user-password',
          roles: ['global_canvas_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_canvas_all_user', 'global_canvas_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_canvas_all_role');
        await security.user.delete('global_canvas_all_user');
      });

      it('shows canvas navlink', async () => {
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.eql([
          'Canvas',
          'Management',
        ]);
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
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31', {
          ensureCurrentUrl: true,
          showLoginIfPrompted: false,
        });

        await PageObjects.canvas.expectAddElementButton();
      });
    });

    describe('global canvas read-only privileges', () => {
      before(async () => {
        await security.role.create('global_canvas_read_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: [
            {
              feature: {
                canvas: ['read']
              },
              spaces: ['*']
            }
          ]
        });

        await security.user.create('global_canvas_read_user', {
          password: 'global_canvas_read_user-password',
          roles: ['global_canvas_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('global_canvas_read_user', 'global_canvas_read_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('global_canvas_read_role');
        await security.user.delete('global_canvas_read_user');
      });

      it('shows canvas navlink', async () => {
        const navLinks = await PageObjects.common.getAppNavLinksText();
        expect(navLinks).to.eql([
          'Canvas',
          'Management',
        ]);
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
          showLoginIfPrompted: false,
        });

        // expect redirection to canvas landing
        await PageObjects.canvas.expectCreateWorkpadButtonDisabled();
      });

      it(`does not allow a workpad to be edited`, async () => {
        await PageObjects.common.navigateToActualUrl('canvas', 'workpad/workpad-1705f884-6224-47de-ba49-ca224fe6ec31', {
          ensureCurrentUrl: true,
          showLoginIfPrompted: false,
        });

        await PageObjects.canvas.expectNoAddElementButton();
      });
    });

    describe.skip('no canvas privileges', () => {
      before(async () => {
        await security.role.create('no_canvas_privileges_role', {
          elasticsearch: {
            indices: [
              { names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }
            ],
          },
          kibana: [
            {
              feature: {
                discover: ['all']
              },
              spaces: ['*']
            }
          ]
        });

        await security.user.create('no_canvas_privileges_user', {
          password: 'no_canvas_privileges_user-password',
          roles: ['no_canvas_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login('no_canvas_privileges_user', 'no_canvas_privileges_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await security.role.delete('no_canvas_privileges_role');
        await security.user.delete('no_canvas_privileges_user');
      });

      it(`landing page redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.LANDING_PAGE_PATH, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`create new dashboard redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit dashboard for object which doesn't exist redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-dont-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });

      it(`edit dashboard for object which exists redirects to the home page`, async () => {
        await PageObjects.common.navigateToActualUrl('kibana', createDashboardEditUrl('i-exist'), {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('homeApp', 10000);
      });
    });
  });
}
