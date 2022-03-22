/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { DATES } from '../constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['common', 'error', 'infraHome', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');

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
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_infrastructure_all_role'),
          security.user.delete('global_infrastructure_all_user'),
        ]);
      });

      it('shows metrics navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql([
          'Overview',
          'Alerts',
          'Rules',
          'Metrics',
          'Cloud Security',
          'Stack Management',
        ]);

      describe('infrastructure landing page without data', () => {
        it('shows no data page', async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '', undefined, {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('~noDataPage');
        });

        it(`doesn't show read-only badge`, async () => {
          await globalNav.badgeMissingOrFail();
        });
      });

      describe('infrastructure landing page with data', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        });

        it(`shows Wafflemap`, async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '', undefined, {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await testSubjects.existOrFail('~waffleMap');
        });

        it(`doesn't show read-only badge`, async () => {
          await globalNav.badgeMissingOrFail();
        });
      });

      it(`metrics page is visible`, async () => {
        await PageObjects.common.navigateToUrlWithBrowserHistory(
          'infraOps',
          '/detail/host/demo-stack-redis-01',
          undefined,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('~infraMetricsPage');
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
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await PageObjects.security.forceLogout();
        await Promise.all([
          security.role.delete('global_infrastructure_read_role'),
          security.user.delete('global_infrastructure_read_user'),
        ]);
      });

      it('shows metrics navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.eql(['Overview', 'Alerts', 'Rules', 'Metrics', 'Stack Management']);
      });

      describe('infrastructure landing page without data', () => {
        it('shows No data page', async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '', undefined, {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await testSubjects.existOrFail('~noDataPage');
        });

        it(`shows read-only badge`, async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });
      });

      describe('infrastructure landing page with data', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        });

        it(`shows Wafflemap`, async () => {
          await PageObjects.common.navigateToUrlWithBrowserHistory('infraOps', '', undefined, {
            ensureCurrentUrl: true,
            shouldLoginIfPrompted: false,
          });
          await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await testSubjects.existOrFail('~waffleMap');
        });

        it(`shows read-only badge`, async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });
      });

      it(`metrics page is visible`, async () => {
        await PageObjects.common.navigateToUrlWithBrowserHistory(
          'infraOps',
          '/detail/host/demo-stack-redis-01',
          undefined,
          {
            ensureCurrentUrl: false,
            shouldLoginIfPrompted: false,
          }
        );
        await testSubjects.existOrFail('~infraMetricsPage');
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
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
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
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        });

        after(async () => {
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
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

      it(`doesn't show metrics navlink`, async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.not.contain(['Metrics']);
      });

      it(`metrics app is inaccessible and returns a 403`, async () => {
        await PageObjects.common.navigateToActualUrl('infraOps', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        PageObjects.error.expectForbidden();
      });
    });
  });
}
