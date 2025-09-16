/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../utils/data_view';
import { disablePrivmonSetting, enablePrivmonSetting } from '../../utils';
import { PrivMonUtils } from './privileged_users/utils';
import {
  createIndexEntitySource,
  createIntegrationEntitySource,
} from './utils/entity_source_fixtures';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');
  const spaces = getService('spaces');
  const customSpace = 'privmontestspace';
  const supertest = getService('supertest');

  const createUserIndex = async (indexName: string) =>
    es.indices.create({
      index: indexName,
      mappings: {
        properties: {
          user: {
            properties: {
              name: {
                type: 'keyword',
                fields: {
                  text: { type: 'text' },
                },
              },
              role: {
                type: 'keyword',
              },
            },
          },
        },
      },
    });

  const waitForPrivMonUsersToBeSynced = async (expectedLength = 1) => {
    let lastSeenLength = -1;

    return retry.waitForWithTimeout('users to be synced', 90000, async () => {
      const res = await api.listPrivMonUsers({ query: {} });
      const currentLength = res.body.length;

      if (currentLength !== lastSeenLength) {
        log.info(`PrivMon users sync check: found ${currentLength} users`);
        lastSeenLength = currentLength;
      }

      return currentLength >= expectedLength;
    });
  };

  async function getPrivMonSoStatus(space: string = 'default') {
    return kibanaServer.savedObjects.find({
      type: 'privilege-monitoring-status',
      space,
    });
  }

  describe('@ess Entity Privilege Monitoring APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const dataViewWithNamespace = dataViewRouteHelpersFactory(supertest, customSpace);

    // Global setup and teardown
    before(async () => {
      await dataView.create('security-solution');
      await spaces.create({
        id: customSpace,
        name: customSpace,
        disabledFeatures: [],
      });
      await dataViewWithNamespace.create('security-solution');
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await dataView.delete('security-solution');
      await dataViewWithNamespace.delete('security-solution');
      await spaces.delete(customSpace);
      await disablePrivmonSetting(kibanaServer);
    });

    afterEach(async () => {
      await api.deleteMonitoringEngine({ query: { data: true } });
    });

    // Health check tests
    describe('health', () => {
      before(async () => {
        await enablePrivmonSetting(kibanaServer);
      });

      after(async () => {
        await disablePrivmonSetting(kibanaServer);
      });

      it('should be healthy', async () => {
        log.info('Checking health of privilege monitoring');
        const res = await api.privMonHealth();

        if (res.status !== 200) {
          log.error('Health check failed');
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).toEqual(200);
      });
    });

    // Disable functionality tests
    describe('privMon disable engine', () => {
      before(async () => {
        // Initialize engines for both default and custom spaces
        await enablePrivmonSetting(kibanaServer);
        await enablePrivmonSetting(kibanaServer, customSpace);
        await api.initMonitoringEngine();
        await api.initMonitoringEngine(customSpace);
      });

      after(async () => {
        // Clean up engines and settings
        await disablePrivmonSetting(kibanaServer);
        await disablePrivmonSetting(kibanaServer, customSpace);
        await api.deleteMonitoringEngine({ query: { data: true } });
        await api.deleteMonitoringEngine({ query: { data: true } }, customSpace);
      });

      it('should disable the privilege monitoring engine in default space', async () => {
        log.info('Disabling privilege monitoring engine');
        const res = await api.disableMonitoringEngine();

        if (res.status !== 200) {
          log.error('Disable failed');
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('disabled');
      });

      it('should disable the privilege monitoring engine in custom space', async () => {
        log.info('Disabling privilege monitoring engine in custom space');

        // Re-initialize for this test since previous test disabled it
        await api.initMonitoringEngine(customSpace);
        const res = await api.disableMonitoringEngine(customSpace);

        if (res.status !== 200) {
          log.error('Disable failed in custom space');
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('disabled');
      });

      it('should not disable when setting is disabled in default space', async () => {
        log.info('Testing disable with setting disabled');
        await disablePrivmonSetting(kibanaServer);

        const res = await api.disableMonitoringEngine();
        expect(res.status).toBe(500);
      });

      it('should not disable when setting is disabled in custom space', async () => {
        log.info('Testing disable with setting disabled in custom space');
        await disablePrivmonSetting(kibanaServer, customSpace);

        const res = await api.disableMonitoringEngine(customSpace);
        expect(res.status).toBe(500);
      });
    });

    // Initialize and disable workflow tests
    describe('privMon init and disable engine workflow', () => {
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
      });

      afterEach(async () => {
        log.info('Cleaning up after test');
        try {
          await api.deleteMonitoringEngine({ query: { data: true } });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
        await disablePrivmonSetting(kibanaServer);
      });

      it('should handle complete init-disable-reinit cycle', async () => {
        // Initialize engine
        log.info('Initializing privilege monitoring engine');
        const initRes = await api.initMonitoringEngine();
        expect(initRes.status).toBe(200);
        expect(initRes.body.status).toBe('started');

        const soStatus = await getPrivMonSoStatus();
        expect(soStatus.saved_objects[0].attributes.status).toBe('started');

        // Disable engine
        log.info('Disabling privilege monitoring engine');
        const disableRes = await api.disableMonitoringEngine();
        expect(disableRes.status).toBe(200);
        expect(disableRes.body.status).toBe('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus();
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Test re-disabling (should be idempotent)
        log.info('Re-disabling privilege monitoring engine');
        const reDisableRes = await api.disableMonitoringEngine();
        expect(reDisableRes.status).toBe(200);
        expect(reDisableRes.body.status).toBe('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus();
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Re-initialize after disable
        log.info('Initializing privilege monitoring engine after disable');
        const initResAfterDisable = await api.initMonitoringEngine();
        expect(initResAfterDisable.status).toBe(200);
        expect(initResAfterDisable.body.status).toBe('started');

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus();
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).toBe('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable');
        const reInitRes = await api.initMonitoringEngine();
        expect(reInitRes.status).toBe(200);
        expect(reInitRes.body.status).toBe('started');

        const soStatusAfterReInit = await getPrivMonSoStatus();
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).toBe('started');
      });
    });

    // Custom space init and disable engine workflow tests
    describe('privMon init and disable engine workflow in custom space', () => {
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer, customSpace);
      });

      afterEach(async () => {
        log.info('Cleaning up after test in custom space');
        try {
          await api.deleteMonitoringEngine({ query: { data: true } }, customSpace);
        } catch (err) {
          log.warning(`Failed to clean up in afterEach for custom space: ${err.message}`);
        }
        await disablePrivmonSetting(kibanaServer, customSpace);
      });

      it('should handle complete init-disable-reinit cycle in custom space', async () => {
        // Initialize engine in custom space
        log.info('Initializing privilege monitoring engine in custom space');
        const initRes = await api.initMonitoringEngine(customSpace);
        expect(initRes.status).toBe(200);
        expect(initRes.body.status).toBe('started');

        const soStatus = await getPrivMonSoStatus(customSpace);
        expect(soStatus.saved_objects[0].attributes.status).toBe('started');

        // Disable engine in custom space
        log.info('Disabling privilege monitoring engine in custom space');
        const disableRes = await api.disableMonitoringEngine(customSpace);
        expect(disableRes.status).toBe(200);
        expect(disableRes.body.status).toBe('disabled');

        const soStatusAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Test re-disabling (should be idempotent)
        log.info('Re-disabling privilege monitoring engine in custom space');
        const reDisableRes = await api.disableMonitoringEngine(customSpace);
        expect(reDisableRes.status).toBe(200);
        expect(reDisableRes.body.status).toBe('disabled');

        const soStatusAfterReDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReDisable.saved_objects[0].attributes.status).toBe('disabled');

        // Re-initialize after disable
        log.info('Initializing privilege monitoring engine after disable in custom space');
        const initResAfterDisable = await api.initMonitoringEngine(customSpace);
        expect(initResAfterDisable.status).toBe(200);
        expect(initResAfterDisable.body.status).toBe('started');

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).toBe('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable in custom space');
        const reInitRes = await api.initMonitoringEngine(customSpace);
        expect(reInitRes.status).toBe(200);
        expect(reInitRes.body.status).toBe('started');

        const soStatusAfterReInit = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).toBe('started');
      });
    });

    describe('init', () => {
      const indexName = 'privileged-users-index-pattern';
      const entitySource = createIndexEntitySource(indexName, { name: 'PrivilegedUsers' });
      const entitySourceIntegration = createIntegrationEntitySource({
        name: '.entity_analytics.monitoring.sources.okta-default',
      });
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
      });
      afterEach(async () => {
        await disablePrivmonSetting(kibanaServer);
        await api.deleteMonitoringEngine({ query: { data: true } });
      });

      it('should not create duplicate monitoring data sources', async () => {
        const response = await api.createEntitySource({ body: entitySource });
        const integrationResponse = await api.createEntitySource({ body: entitySourceIntegration });
        expect(response.status).toBe(200);
        expect(integrationResponse.status).toBe(200);
        const sources = await api.listEntitySources({ query: {} });
        const names = sources.body.map((s: any) => s.name);
        // confirm sources have been created
        expect(names).toEqual(
          expect.arrayContaining([
            'PrivilegedUsers',
            '.entity_analytics.monitoring.sources.okta-default',
          ])
        );
        // Try to create the same entity sources again
        await api.createEntitySource({ body: entitySource });
        await api.createEntitySource({ body: entitySourceIntegration });
        const nonDuplicateSources = await api.listEntitySources({ query: {} });
        const nonDuplicateNames = nonDuplicateSources.body.map((s: any) => s.name);
        // confirm duplicates have not been created
        expect(names.length).toBe(nonDuplicateNames.length);
      });

      it('should be able to be called multiple times', async () => {
        log.info(`Initializing Privilege Monitoring engine`);
        const res1 = await api.initMonitoringEngine();

        if (res1.status !== 200) {
          log.error(`Failed to initialize engine`);
          log.error(JSON.stringify(res1.body));
        }

        expect(res1.status).toEqual(200);

        log.info(`Re-initializing Privilege Monitoring engine`);
        const res2 = await api.initMonitoringEngine();
        if (res2.status !== 200) {
          log.error(`Failed to re-initialize engine`);
          log.error(JSON.stringify(res2.body));
        }

        expect(res2.status).toEqual(200);
      });
    });

    describe('schedule now', () => {
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
        await api.initMonitoringEngine();
      });
      afterEach(async () => {
        await disablePrivmonSetting(kibanaServer);
        await api.deleteMonitoringEngine({ query: { data: true } });
      });
      it('should return a 409 if the task is already running', async () => {
        await privMonUtils.setPrivmonTaskStatus(TaskStatus.Running);
        await privMonUtils.scheduleMonitoringEngineNow({ expectStatusCode: 409 });
      });
    });

    describe('plain index sync', () => {
      const indexName = 'tatooine-privileged-users';
      const entitySource = createIndexEntitySource(indexName, { name: 'StarWars' });

      beforeEach(async () => {
        await createUserIndex(indexName);
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();
      });

      afterEach(async () => {
        try {
          await es.indices.delete({ index: indexName }, { ignore: [404] });
        } catch (err) {
          log.warning(`Failed to clean up in afterEach: ${err.message}`);
        }
        await api.deleteMonitoringEngine({ query: { data: true } });
        await disablePrivmonSetting(kibanaServer);
      });

      it('should sync plain index', async () => {
        const uniqueUsernames = [
          'Luke Skywalker',
          'Leia Organa',
          'Han Solo',
          'Chewbacca',
          'Obi-Wan Kenobi',
          'Yoda',
          'R2-D2',
          'C-3PO',
          'Darth Vader',
        ];

        const nameToOp = (name: string) => [{ index: {} }, { user: { name, role: 'admin' } }];

        const uniqueUserOps = uniqueUsernames.flatMap(nameToOp);
        const repeatedUserOps = Array.from({ length: 150 }).flatMap(() => nameToOp('C-3PO'));

        await es.bulk({
          index: indexName,
          body: [...uniqueUserOps, ...repeatedUserOps],
          refresh: true,
        });

        // register entity source
        const response = await api.createEntitySource({ body: entitySource });
        expect(response.status).toBe(200);

        // default-monitoring-index should exist now
        const sources = await api.listEntitySources({ query: {} });
        const names = sources.body.map((s: any) => s.name);
        expect(names).toContain('StarWars');
        await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });
        await privMonUtils.waitForSyncTaskRun();
        await waitForPrivMonUsersToBeSynced(uniqueUsernames.length);
        // Check if the users are indexed
        const res = await api.listPrivMonUsers({ query: {} });
        const userNames = res.body.map((u: any) => u.user.name);
        expect(userNames).toContain('Luke Skywalker');
        expect(userNames).toContain('C-3PO');
        expect(userNames.filter((name: string) => name === 'C-3PO')).toHaveLength(1);
      });
    });

    describe('integrations sync', async () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta',
          { useCreate: true }
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta'
        );
      });

      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();
        await kibanaServer.uiSettings.update({
          'securitySolution:entityAnalytics:privilegeMonitoring:enableIntegrations': true,
        });
      });

      afterEach(async () => {
        // delete the okta index
        await api.deleteMonitoringEngine({ query: { data: true } });
        await disablePrivmonSetting(kibanaServer);
      });

      it('update detection should sync integrations', async () => {
        // schedule a sync
        await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });
        await privMonUtils.waitForSyncTaskRun();
        const res = await api.listPrivMonUsers({ query: {} });
        // each user should be privileged and have correct source
        res.body.forEach((r: any) => {
          expect(r.user.is_privileged).toBe(true);
          expect(r.user.name).toBeDefined();
          expect(r.labels.sources).toContain('entity_analytics_integration');
        });
        // update okta user to non-privileged, to test sync updates
        await privMonUtils.updateOktaUserRole('AZlHQD20hY07UD0HNBs-', false);
        // schedule another sync
        await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });
        await privMonUtils.waitForSyncTaskRun();
        const res2 = await api.listPrivMonUsers({ query: {} });
        // find the updated user
        const updatedUser = res2.body.find((u: any) => u.user.name === 'Mable.Mann');
        // check user is now non-privileged and does not have integration source
        expect(updatedUser.user.is_privileged).toBe(false);
        expect(updatedUser.labels.sources).toHaveLength(0);
      });

      it.skip('deletion detection should delete users on full sync', async () => {
        // placeholder for deletion detection
      });
    });

    describe('default entity sources', () => {
      beforeEach(async () => {});
      afterEach(async () => {
        await api.deleteMonitoringEngine({ query: { data: true } });
        await disablePrivmonSetting(kibanaServer);
      });
      it('should create default entity sources on privileged monitoring engine initialization', async () => {
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();

        const sources = await api.listEntitySources({ query: {} });
        const names = sources.body.map((s: any) => s.name);
        expect(names).toEqual(
          expect.arrayContaining([
            '.entity_analytics.monitoring.sources.okta-default',
            '.entity_analytics.monitoring.sources.ad-default',
            '.entity_analytics.monitoring.users-default',
          ])
        );
      });
    });
  });
};
