/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { getSavedQuerySecurityUtils } from '../utils/saved_query_security';

type AppName = 'discover' | 'dashboard' | 'maps' | 'visualize';

const apps: AppName[] = ['discover', 'dashboard', 'maps', 'visualize'];

export default function (ctx: FtrProviderContext) {
  const { getPageObjects, getService } = ctx;
  const savedQuerySecurityUtils = getSavedQuerySecurityUtils(ctx);
  const esArchiver = getService('esArchiver');
  const securityService = getService('security');
  const globalNav = getService('globalNav');
  const { common, discover, security, dashboard, maps, visualize } = getPageObjects([
    'common',
    'discover',
    'security',
    'dashboard',
    'maps',
    'visualize',
  ]);
  const kibanaServer = getService('kibanaServer');

  async function login(
    appName: AppName,
    appPrivilege: 'read' | 'all',
    globalPrivilege: 'none' | 'all'
  ) {
    const name = `global_saved_query_${appName}`;
    const password = `password_${name}_${appPrivilege}_${globalPrivilege}`;

    await securityService.role.create(name, {
      elasticsearch: {
        indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            [appName]: [appPrivilege],
            savedQueryManagement: [globalPrivilege],
          },
          spaces: ['*'],
        },
      ],
    });

    await securityService.user.create(`${name}-user`, {
      password,
      roles: [name],
      full_name: 'test user',
    });

    await security.login(`${name}-user`, password, {
      expectSpaceSelector: false,
    });
  }

  async function logout(appName: AppName) {
    const name = `global_saved_query_${appName}`;
    await security.forceLogout();
    await securityService.role.delete(name);
    await securityService.user.delete(`${name}-user`);
  }

  async function navigateToApp(appName: AppName) {
    switch (appName) {
      case 'discover':
        await common.navigateToApp('discover');
        await discover.selectIndexPattern('logstash-*');
        break;
      case 'dashboard':
        await dashboard.navigateToApp();
        await dashboard.loadSavedDashboard('A Dashboard');
        break;
      case 'maps':
        await maps.openNewMap();
        break;
      case 'visualize':
        await visualize.navigateToNewVisualization();
        await visualize.clickVisType('lens');
        break;
      default:
        break;
    }
  }

  describe('Security: App vs Global privilege', () => {
    apps.forEach((appName) => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();

        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/security/security.json'
        );

        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');

        // ensure we're logged out, so we can log in as the appropriate users
        await security.forceLogout();
      });

      after(async () => {
        // logout, so the other tests don't accidentally run as the custom users we're testing below
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await security.forceLogout();

        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/dashboard/feature_controls/security/security.json'
        );

        await kibanaServer.savedObjects.cleanStandardList();
      });

      describe(`${appName} read-only privileges with enabled savedQueryManagement.saveQuery privilege`, () => {
        before(async () => {
          await login(appName, 'read', 'all');
          await navigateToApp(appName);
          await common.waitForTopNavToBeVisible();
        });

        after(async () => {
          await logout(appName);
        });

        it('shows read-only badge', async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });

        savedQuerySecurityUtils.shouldAllowSavingQueries();
      });

      describe(`${appName} read-only privileges with disabled savedQueryManagement.saveQuery privilege`, () => {
        before(async () => {
          await login(appName, 'read', 'none');
          await navigateToApp(appName);
        });

        after(async () => {
          await logout(appName);
        });

        it('shows read-only badge', async () => {
          await globalNav.badgeExistsOrFail('Read only');
        });

        savedQuerySecurityUtils.shouldDisallowSavingButAllowLoadingSavedQueries();
      });

      describe(`${appName} all privileges with enabled savedQueryManagement.saveQuery privilege`, () => {
        before(async () => {
          await login(appName, 'all', 'all');
          await navigateToApp(appName);
        });

        after(async () => {
          await logout(appName);
        });

        it("doesn't show read-only badge", async () => {
          await globalNav.badgeMissingOrFail();
        });

        savedQuerySecurityUtils.shouldAllowSavingQueries();
      });

      describe(`${appName} all privileges with disabled savedQueryManagement.saveQuery privilege`, () => {
        before(async () => {
          await login(appName, 'all', 'none');
          await navigateToApp(appName);
        });

        after(async () => {
          await logout(appName);
        });

        it("doesn't show read-only badge", async () => {
          await globalNav.badgeMissingOrFail();
        });

        savedQuerySecurityUtils.shouldAllowSavingQueries();
      });
    });
  });
}
