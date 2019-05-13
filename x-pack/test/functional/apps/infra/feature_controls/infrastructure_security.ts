/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';
import { DATES } from '../constants';

const DATE_WITH_DATA = new Date(DATES.metricsAndLogs.hosts.withData);
// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'infraHome', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const retry = getService('retry');

  describe('infrastructure security', () => {
    describe('global infrastructure all privileges', () => {
      before(async () => {
        await security.role.create('global_infrastructure_all_role', {
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

        await security.user.create('global_infrastructure_all_user', {
          password: 'global_infrastructure_all_user-password',
          roles: ['global_infrastructure_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_infrastructure_all_user',
          'global_infrastructure_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_infrastructure_all_role'),
          security.user.delete('global_infrastructure_all_user'),
          PageObjects.security.forceLogout(),
        ]);
      });

      it('shows infrastructure navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Infrastructure', 'Management']);
      });

      describe('infrastructure landing page without data', () => {
        it(`shows 'Change source configuration' button`, async () => {
          await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('infrastructureViewSetupInstructionsButton');
          await testSubjects.existOrFail('configureSourceButton');
        });

        it(`doesn't show read-only badge`, async () => {
          await globalNav.badgeMissingOrFail();
        });
      });

      describe('infrastructure landing page with data', () => {
        before(async () => {
          await esArchiver.load('infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('infra/metrics_and_logs');
        });

        it(`shows Wafflemap`, async () => {
          await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await testSubjects.existOrFail('waffleMap');
        });

        describe('context menu', () => {
          before(async () => {
            await testSubjects.click('nodeContainer');
          });

          it(`does not show link to view logs`, async () => {
            await retry.waitFor('context menu', () => testSubjects.exists('nodeContextMenu'));
            await testSubjects.missingOrFail('viewLogsContextMenuItem');
          });

          it(`does not show link to view apm traces`, async () => {
            await retry.waitFor('context menu', () => testSubjects.exists('nodeContextMenu'));
            await testSubjects.missingOrFail('viewApmTracesContextMenuItem');
          });
        });

        it(`doesn't show read-only badge`, async () => {
          await globalNav.badgeMissingOrFail();
        });
      });

      it(`metrics page is visible`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'infraOps',
          '/metrics/host/demo-stack-redis-01',
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('infraMetricsPage');
      });
    });

    describe('global infrastructure read privileges', () => {
      before(async () => {
        await security.role.create('global_infrastructure_read_role', {
          elasticsearch: {
            indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_infrastructure_read_user', {
          password: 'global_infrastructure_read_user-password',
          roles: ['global_infrastructure_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_infrastructure_read_user',
          'global_infrastructure_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await Promise.all([
          security.role.delete('global_infrastructure_read_role'),
          security.user.delete('global_infrastructure_read_user'),
          PageObjects.security.forceLogout(),
        ]);
      });

      it('shows infrastructure navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.eql(['Infrastructure', 'Management']);
      });

      describe('infrastructure landing page without data', () => {
        it(`doesn't show 'Change source configuration' button`, async () => {
          await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('infrastructureViewSetupInstructionsButton');
          await testSubjects.missingOrFail('configureSourceButton');
        });

        it(`shows read-only badge`, async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });
      });

      describe('infrastructure landing page with data', () => {
        before(async () => {
          await esArchiver.load('infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('infra/metrics_and_logs');
        });

        it(`shows Wafflemap`, async () => {
          await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await testSubjects.existOrFail('waffleMap');
        });

        describe('context menu', () => {
          before(async () => {
            await testSubjects.click('nodeContainer');
          });

          it(`does not show link to view logs`, async () => {
            await retry.waitFor('context menu', () => testSubjects.exists('nodeContextMenu'));
            await testSubjects.missingOrFail('viewLogsContextMenuItem');
          });

          it(`does not show link to view apm traces`, async () => {
            await retry.waitFor('context menu', () => testSubjects.exists('nodeContextMenu'));
            await testSubjects.missingOrFail('viewApmTracesContextMenuItem');
          });
        });

        it(`shows read-only badge`, async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });
      });

      it(`metrics page is visible`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'infraOps',
          '/metrics/host/demo-stack-redis-01',
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('infraMetricsPage');
      });
    });

    describe('global infrastructure read & logs read privileges', () => {
      before(async () => {
        await security.role.create('global_infrastructure_logs_read_role', {
          elasticsearch: {
            indices: [
              {
                names: ['metricbeat-*', 'filebeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
                logs: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_infrastructure_logs_read_user', {
          password: 'global_infrastructure_logs_read_user-password',
          roles: ['global_infrastructure_logs_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_infrastructure_logs_read_user',
          'global_infrastructure_logs_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_infrastructure_logs_read_role');
        await security.user.delete('global_infrastructure_logs_read_user');
      });

      describe('infrastructure landing page with data', () => {
        before(async () => {
          await esArchiver.load('infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('infra/metrics_and_logs');
        });

        it(`context menu allows user to view logs`, async () => {
          await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await testSubjects.existOrFail('waffleMap');
          await testSubjects.click('nodeContainer');
          await retry.waitFor('context menu', () => testSubjects.exists('nodeContextMenu'));
          await testSubjects.click('viewLogsContextMenuItem');
          await testSubjects.existOrFail('infraLogsPage');
        });
      });
    });

    describe('global infrastructure read & apm privileges', () => {
      before(async () => {
        await security.role.create('global_infrastructure_apm_read_role', {
          elasticsearch: {
            indices: [
              {
                names: ['metricbeat-*', 'filebeat-*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
          },
          kibana: [
            {
              feature: {
                infrastructure: ['read'],
                apm: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_infrastructure_apm_read_user', {
          password: 'global_infrastructure_apm_read_user-password',
          roles: ['global_infrastructure_apm_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_infrastructure_apm_read_user',
          'global_infrastructure_apm_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('global_infrastructure_apm_read_role');
        await security.user.delete('global_infrastructure_apm_read_user');
      });

      describe('infrastructure landing page with data', () => {
        before(async () => {
          await esArchiver.load('infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('infra/metrics_and_logs');
        });

        it(`context menu allows user to view APM traces`, async () => {
          await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await testSubjects.existOrFail('waffleMap');
          await testSubjects.click('nodeContainer');
          await retry.waitFor('context menu', () => testSubjects.exists('nodeContextMenu'));
          await testSubjects.click('viewApmTracesContextMenuItem');
          await testSubjects.existOrFail('apmMainContainer');
        });
      });
    });

    describe('global infrastructure no privileges', () => {
      before(async () => {
        await security.role.create('no_infrastructure_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
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

        await security.user.create('no_infrastructure_privileges_user', {
          password: 'no_infrastructure_privileges_user-password',
          roles: ['no_infrastructure_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_infrastructure_privileges_user',
          'no_infrastructure_privileges_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await security.role.delete('no_infrastructure_privileges_role');
        await security.user.delete('no_infrastructure_privileges_user');
      });

      it(`doesn't show infrastructure navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.not.contain(['Infrastructure']);
      });

      it(`infrastructure root renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('infraNotFoundPage');
      });

      it(`infrastructure home page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'home', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('infraNotFoundPage');
      });

      it(`infrastructure landing page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'infrastructure', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('infraNotFoundPage');
      });

      it(`infrastructure snapshot page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', 'infrastructure/inventory', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('infraNotFoundPage');
      });

      it(`metrics page renders not found page`, async () => {
        await PageObjects.common.navigateToActualUrl(
          'infraOps',
          '/metrics/host/demo-stack-redis-01',
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('infraNotFoundPage');
      });
    });
  });
}
