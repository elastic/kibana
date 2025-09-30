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
import {
  disablePrivmonSetting,
  enablePrivmonSetting,
  toggleIntegrationsSyncFlag,
} from '../../utils';
import {
  PrivMonUtils,
  PlainIndexSyncUtils,
  createIndexEntitySource,
  createIntegrationEntitySource,
} from './utils';
export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');
  const es = getService('es');
  const spaces = getService('spaces');
  const supertest = getService('supertest');

  const customSpace = 'privmontestspace';

  const privMonUtilsCustomSpace = PrivMonUtils(getService, customSpace);

  async function getPrivMonSoStatus(space: string = 'default') {
    return kibanaServer.savedObjects.find({
      type: 'privilege-monitoring-status',
      space,
    });
  }

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring APIs', () => {
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
        await privMonUtils.initPrivMonEngine();
        await privMonUtilsCustomSpace.initPrivMonEngine();
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
        await privMonUtils.initPrivMonEngine();
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
        await privMonUtils.initPrivMonEngine();
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
        await privMonUtils.initPrivMonEngine();

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus();
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).toBe('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable');
        await privMonUtils.initPrivMonEngine();

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
        await privMonUtilsCustomSpace.initPrivMonEngine();

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
        await privMonUtilsCustomSpace.initPrivMonEngine();

        const soStatusOnInitAfterDisable = await getPrivMonSoStatus(customSpace);
        expect(soStatusOnInitAfterDisable.saved_objects[0].attributes.status).toBe('started');

        // Test re-initializing (should be idempotent)
        log.info('Re-initializing privilege monitoring engine after disable in custom space');
        await privMonUtilsCustomSpace.initPrivMonEngine();

        const soStatusAfterReInit = await getPrivMonSoStatus(customSpace);
        expect(soStatusAfterReInit.saved_objects[0].attributes.status).toBe('started');
      });
    });

    describe('init', () => {
      const indexName = 'privileged-users-index-pattern';
      const entitySource = createIndexEntitySource(indexName, { name: 'PrivilegedUsers' });
      const entitySourceIntegration = createIntegrationEntitySource({
        name: '.entity_analytics.monitoring.sources.entityanalytics_okta-default',
      });
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
      });
      afterEach(async () => {
        await disablePrivmonSetting(kibanaServer);
        await es.indices.delete({ index: indexName }, { ignore: [404] });
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
            '.entity_analytics.monitoring.sources.entityanalytics_okta-default',
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
        await privMonUtils.initPrivMonEngine();
        log.info(`Re-initializing Privilege Monitoring engine`);
        await privMonUtils.initPrivMonEngine();
      });
    });

    describe('schedule now', () => {
      beforeEach(async () => {
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();
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

    describe('Plain index sync', () => {
      const indexName = 'tatooine-privileged-users';
      const indexSyncUtils = PlainIndexSyncUtils(getService, indexName);

      beforeEach(async () => {
        await indexSyncUtils.createIndex();
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();
      });

      afterEach(async () => {
        await indexSyncUtils.deleteIndex();
        await api.deleteMonitoringEngine({ query: { data: true } });
        await disablePrivmonSetting(kibanaServer);
      });

      it('should not create duplicate users', async () => {
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

        const repeatedUsers = Array.from({ length: 150 }).map(() => 'C-3PO');

        await indexSyncUtils.addUsersToIndex([...uniqueUsernames, ...repeatedUsers]);
        await indexSyncUtils.createEntitySourceForIndex();

        const users = await privMonUtils.scheduleEngineAndWaitForUserCount(uniqueUsernames.length);

        // Check if the users are indexed
        const userNames = users.map((u: any) => u.user.name);
        expect(userNames).toContain('Luke Skywalker');
        expect(userNames).toContain('C-3PO');
        expect(userNames.filter((name: string) => name === 'C-3PO')).toHaveLength(1);
      });

      it('should soft delete user when they are removed', async () => {
        await indexSyncUtils.addUsersToIndex(['user1', 'user2']);

        await indexSyncUtils.createEntitySourceForIndex();

        const usersBefore = await privMonUtils.scheduleEngineAndWaitForUserCount(2);
        const user1Before = privMonUtils.findUser(usersBefore, 'user1');
        log.info(`User 1 before: ${JSON.stringify(user1Before)}`);
        await indexSyncUtils.deleteUserFromIndex('user1');
        // add a new user so we know when the task completes
        await indexSyncUtils.addUsersToIndex(['user3']);

        const usersAfter = await privMonUtils.scheduleEngineAndWaitForUserCount(3);
        const user1After = privMonUtils.findUser(usersAfter, 'user1');
        log.info(`User 1 after: ${JSON.stringify(user1After)}`);
        privMonUtils.expectTimestampsHaveBeenUpdated(user1Before, user1After);
        privMonUtils.assertIsPrivileged(user1After, false);
      });

      it('should update a user when it was already added by the API', async () => {
        const user1 = { name: 'user1' };
        await api.createPrivMonUser({
          body: { user: user1 },
        });

        const { body: usersBeforeSync } = await api.listPrivMonUsers({ query: {} });
        const user1Before = privMonUtils.findUser(usersBeforeSync, user1.name);
        log.info(`User 1 before: ${JSON.stringify(user1Before)}`);

        await indexSyncUtils.addUsersToIndex([user1.name]);
        await indexSyncUtils.createEntitySourceForIndex();

        const usersAfterSync = await privMonUtils.scheduleEngineAndWaitForUserCount(1);
        const user1After = privMonUtils.findUser(usersAfterSync, user1.name);
        log.info(`User 1 after: ${JSON.stringify(user1After)}`);

        privMonUtils.assertIsPrivileged(user1After, true);
        expect(user1After?.user?.name).toEqual(user1.name);
        expect(user1After?.labels?.sources).toEqual(['api', 'index']);
        privMonUtils.expectTimestampsHaveBeenUpdated(user1Before, user1After);
      });

      it('should not update timestamps when re-syncing the same user', async () => {
        const user1 = { name: 'user1' };
        await indexSyncUtils.addUsersToIndex([user1.name]);
        await indexSyncUtils.createEntitySourceForIndex();

        const usersAfterFirstSync = await privMonUtils.scheduleEngineAndWaitForUserCount(1);
        const user1AfterFirstSync = privMonUtils.findUser(usersAfterFirstSync, user1.name);
        log.info(`User 1 after first sync: ${JSON.stringify(user1AfterFirstSync)}`);

        const usersAfterSecondSync = await privMonUtils.scheduleEngineAndWaitForUserCount(1);
        const user1AfterSecondSync = privMonUtils.findUser(usersAfterSecondSync, user1.name);
        log.info(`User 1 after second sync: ${JSON.stringify(user1AfterSecondSync)}`);

        expect(user1AfterSecondSync?.['@timestamp']).toEqual(user1AfterFirstSync?.['@timestamp']);
        expect(user1AfterSecondSync?.event?.ingested).toEqual(user1AfterFirstSync?.event?.ingested);
      });
    });

    describe('integrations sync', async () => {
      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta',
          { useCreate: true }
        );
        // Set timestamps to be within last month so they are included in sync (default first run is now - 1M)
        await privMonUtils.integrationsSync.updateIntegrationsUsersWithRelativeTimestamps({
          indexPattern: 'logs-entityanalytics_okta.user-default',
        });
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();
        await toggleIntegrationsSyncFlag(kibanaServer, true);
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta'
        );
        // delete the okta index
        await api.deleteMonitoringEngine({ query: { data: true } });
        await disablePrivmonSetting(kibanaServer);
        await toggleIntegrationsSyncFlag(kibanaServer, false);
      });

      it('should sync integrations during update detection ', async () => {
        // schedule a sync
        const monitoringSource = await privMonUtils.getIntegrationMonitoringSource(
          'entityanalytics_okta'
        );
        expect(monitoringSource).toBeDefined();
        expect(monitoringSource?.name).toBe(
          '.entity_analytics.monitoring.sources.entityanalytics_okta-default'
        );
        await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });
        await privMonUtils.waitForSyncTaskRun();

        const { body: usersBefore } = await api.listPrivMonUsers({ query: {} });
        // each user should be privileged and have correct source
        usersBefore.forEach((r: any) => {
          privMonUtils.assertIsPrivileged(r, true);
          expect(r.user.name).toBeDefined();
          expect(r.labels.sources).toContain('entity_analytics_integration');
          expect(r.labels.source_ids).toContain(monitoringSource?.id);
        });
        expect(usersBefore.length).toBe(6); // should be 6 privileged users

        const mableBefore = privMonUtils.findUser(usersBefore, 'Mable.Mann');
        expect(mableBefore).toBeDefined();
        expect(mableBefore?.entity_analytics_monitoring?.labels).toEqual([
          {
            field: 'user.roles',
            source: monitoringSource?.id,
            value: 'Group Administrator',
          },
        ]);

        const kathryneBefore = privMonUtils.findUser(usersBefore, 'Kathryne.Ziemann');
        expect(kathryneBefore).toBeDefined();
        expect(kathryneBefore?.entity_analytics_monitoring?.labels).toEqual([
          {
            field: 'user.roles',
            source: monitoringSource?.id,
            value: 'Read-only Administrator',
          },
        ]);

        // update okta user to non-privileged, to test sync updates
        await privMonUtils.integrationsSync.setIntegrationUserPrivilege({
          id: 'AZlHQD20hY07UD0HNBs-',
          isPrivileged: false,
          indexPattern: 'logs-entityanalytics_okta.user-default',
        });
        // schedule another sync
        await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });
        await privMonUtils.waitForSyncTaskRun();
        const { body: usersAfter } = await api.listPrivMonUsers({ query: {} });

        // find the updated user
        const mableAfter = privMonUtils.findUser(usersAfter, 'Mable.Mann');
        expect(mableAfter).toBeDefined();
        privMonUtils.assertIsPrivileged(mableAfter, false);
        expect(mableAfter?.entity_analytics_monitoring?.labels).toEqual([]);
        privMonUtils.expectTimestampsHaveBeenUpdated(mableBefore, mableAfter);

        // kathryne should remain privileged
        const kathryneAfter = privMonUtils.findUser(usersAfter, 'Kathryne.Ziemann');
        expect(kathryneAfter).toBeDefined();
        privMonUtils.assertIsPrivileged(kathryneAfter, true);
        expect(kathryneAfter?.labels?.source_ids).toContain(monitoringSource?.id);
        expect(kathryneAfter?.labels?.sources).toContain('entity_analytics_integration');
        expect(kathryneAfter?.entity_analytics_monitoring?.labels).toEqual([
          {
            field: 'user.roles',
            source: monitoringSource?.id,
            value: 'Read-only Administrator',
          },
        ]);
        expect(kathryneAfter?.['@timestamp']).toEqual(kathryneBefore?.['@timestamp']);
        expect(kathryneAfter?.event?.ingested).toEqual(kathryneBefore?.event?.ingested);
      });

      it('should update and create users within lastProcessedMarker range during update detection ', async () => {
        const oktaIndex = 'logs-entityanalytics_okta.user-default';
        const IDS = {
          devon: 'AZmLBcGV9XhZAwOqZV5t', // Devan.Nienow
          elinor: 'AZmLBcGV9XhZAwOqZV5u', // Elinor.Johnston-Shanahan
          kaelyn: 'AZmLBcGV9XhZAwOqZV5s', // Kaelyn.Shanahan
          bennett: 'AZmLBcGV9XhZAwOqZV5y', // Bennett.Becker
        };
        // --- Timestamps
        const nowMinus1M1D = await privMonUtils.integrationsSync.dateOffsetFromNow({
          months: 2,
          days: 1,
        });
        const nowMinus2M = await privMonUtils.integrationsSync.dateOffsetFromNow({ months: 2 });
        const nowMinus1w = await privMonUtils.integrationsSync.dateOffsetFromNow({ days: 7 });
        const nowMinus6d = await privMonUtils.integrationsSync.dateOffsetFromNow({ days: 6 });
        // PHASE 1: Push two users out of range, sync => expect 4 privileged remain
        await privMonUtils.integrationsSync.setTimestamp(IDS.devon, nowMinus1M1D, oktaIndex);
        await privMonUtils.integrationsSync.setTimestamp(IDS.elinor, nowMinus2M, oktaIndex);
        await privMonUtils.runSync();
        const snapA = await privMonUtils.integrationsSync.expectUserCount(4);

        // PHASE 2: Re-run with no changes => no processing, marker should be default (now-1M)
        await privMonUtils.runSync();
        const snapB = await privMonUtils.integrationsSync.expectUserCount(4);
        expect(new Set(snapB)).toEqual(new Set(snapA));

        const markerAfterPhase2 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          oktaIndex
        );
        expect(markerAfterPhase2).toBe(
          privMonUtils.integrationsSync.DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP
        );

        // PHASE 3: Bring one user back in-range, sync => last processed marker updates to that timestamp
        await privMonUtils.integrationsSync.setTimestamp(IDS.kaelyn, nowMinus1w, oktaIndex);
        await privMonUtils.runSync();
        const markerAfterPhase3 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          oktaIndex
        );
        expect(markerAfterPhase3).toBe(nowMinus1w);

        // PHASE 4: Flip a non-privileged user to privileged + in-range, sync => count 5, last processed marker updates
        await privMonUtils.integrationsSync.setIntegrationUserPrivilege({
          id: IDS.bennett,
          isPrivileged: true,
          indexPattern: 'logs-entityanalytics_okta.user-default',
        });
        await privMonUtils.integrationsSync.setTimestamp(IDS.bennett, nowMinus6d, oktaIndex);

        await privMonUtils.runSync();
        await privMonUtils.integrationsSync.expectUserCount(5);

        const markerAfterPhase4 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          oktaIndex
        );
        expect(markerAfterPhase4).toBe(nowMinus6d);
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
        const syncMarkersIndices = sources.body.map((s: any) => s.integrations?.syncMarkerIndex);
        // confirm default sources have been created
        expect(names).toEqual(
          expect.arrayContaining([
            '.entity_analytics.monitoring.sources.entityanalytics_okta-default',
            // '.entity_analytics.monitoring.sources.ad-default',
            '.entity_analytics.monitoring.users-default',
          ])
        );
        expect(syncMarkersIndices).toEqual(
          expect.arrayContaining([
            'logs-entityanalytics_okta.entity-default',
            //  '.entity_analytics.monitoring.sources.ad-default',
          ])
        );
      });
    });
  });
};
