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
  const PageObjects = getPageObjects(['common', 'infraHome', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

  describe('logs security', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });
    describe('global logs all privileges', () => {
      before(async () => {
        await security.role.create('global_logs_all_role', {
          elasticsearch: {
            indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                logs: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_logs_all_user', {
          password: 'global_logs_all_user-password',
          roles: ['global_logs_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login('global_logs_all_user', 'global_logs_all_user-password', {
          expectSpaceSelector: false,
        });
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_logs_all_role'),
          security.user.delete('global_logs_all_user'),
        ]);
      });

      it('shows logs navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Logs');
      });

      describe('logs landing page without data', () => {
        it(`shows 'Change source configuration' button`, async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraLogs', '', undefined, {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('~infraLogsPage');
          await testSubjects.existOrFail('~logsViewSetupInstructionsButton');
          await testSubjects.existOrFail('~configureSourceButton');
        });

        it(`doesn't show read-only badge`, async () => {
          await globalNav.badgeMissingOrFail();
        });
      });
    });

    describe('global logs read privileges', () => {
      before(async () => {
        await security.role.create('global_logs_read_role', {
          elasticsearch: {
            indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                logs: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_logs_read_user', {
          password: 'global_logs_read_user-password',
          roles: ['global_logs_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_logs_read_user',
          'global_logs_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_logs_read_role'),
          security.user.delete('global_logs_read_user'),
        ]);
      });

      it('shows logs navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Logs');
      });

      describe('logs landing page without data', () => {
        it(`doesn't show 'Change source configuration' button`, async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraLogs', '', undefined, {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('~infraLogsPage');
          await testSubjects.existOrFail('~logsViewSetupInstructionsButton');
          await testSubjects.missingOrFail('~configureSourceButton');
        });

        it(`shows read-only badge`, async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });
      });
    });

    describe('global logs no privileges', () => {
      before(async () => {
        await security.role.create('global_logs_no_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_logs_no_privileges_user', {
          password: 'global_logs_no_privileges_user-password',
          roles: ['global_logs_no_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_logs_no_privileges_user',
          'global_logs_no_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_logs_no_privileges_role'),
          security.user.delete('global_logs_no_privileges_user'),
        ]);
      });

      it(`doesn't show logs navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.not.contain('Logs');
      });

      it(`logs app is inaccessible and Application Not Found message is rendered`, async () => {
        await PageObjects.common.navigateToApp('infraLogs');
        await testSubjects.existOrFail('~appNotFoundPageContent');
        await PageObjects.common.navigateToUrlWithBrowserHistory(
          'infraLogs',
          '/stream',
          undefined,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('~appNotFoundPageContent');
      });
    });
  });
}
