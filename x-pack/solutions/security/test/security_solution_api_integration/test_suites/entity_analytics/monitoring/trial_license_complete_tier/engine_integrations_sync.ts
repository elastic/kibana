/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../utils';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');
  const es = getService('es');

  // Helper function to log full index contents for debugging
  const logIndexContents = async (indexPattern: string, phase: string) => {
    try {
      const searchResult = await es.search({
        index: indexPattern,
        size: 1000,
        query: { match_all: {} },
        sort: [{ '@timestamp': { order: 'asc' } }],
      });
      log.info(
        `[${phase}] Index ${indexPattern} contents (${searchResult.hits.hits.length} documents):`
      );
      searchResult.hits.hits.forEach((hit: any, idx: number) => {
        log.info(
          `[${phase}] Document ${idx + 1} (ID: ${hit._id}): ${JSON.stringify(
            {
              '@timestamp': hit._source?.['@timestamp'],
              'user.name': hit._source?.user?.name,
              'user.is_privileged': hit._source?.user?.is_privileged,
              'user.roles': hit._source?.user?.roles,
              'user.entity.attributes.Privileged':
                hit._source?.user?.entity?.attributes?.Privileged,
            },
            null,
            2
          )}`
        );
      });
    } catch (error) {
      log.error(
        `[${phase}] Error logging index contents for ${indexPattern}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Helper function to log all users from API
  const logUsersFromAPI = async (phase: string) => {
    try {
      const { body: users } = await api.listPrivMonUsers({ query: {} });
      log.info(`[${phase}] Users from API (count: ${users.length}):`);
      users.forEach((user: any, idx: number) => {
        log.info(
          `[${phase}] User ${idx + 1}: ${JSON.stringify(
            {
              name: user.user?.name,
              is_privileged: user.user?.is_privileged,
              '@timestamp': user['@timestamp'],
              'event.ingested': user.event?.ingested,
              'labels.sources': user.labels?.sources,
              'labels.source_ids': user.labels?.source_ids,
              'entity_analytics_monitoring.labels': user.entity_analytics_monitoring?.labels,
            },
            null,
            2
          )}`
        );
      });
      return users;
    } catch (error) {
      log.error(
        `[${phase}] Error logging users from API: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  };

  // Helper function to log sync data and last processed marker
  const logSyncData = async (phase: string) => {
    try {
      const syncData = await privMonUtils.integrationsSync.getSyncData(
        privMonUtils.integrationsSync.OKTA_INDEX
      );
      const lastProcessedMarker = await privMonUtils.integrationsSync.getLastProcessedMarker(
        privMonUtils.integrationsSync.OKTA_INDEX
      );
      log.info(`[${phase}] Sync Data: ${JSON.stringify(syncData, null, 2)}`);
      log.info(`[${phase}] Last Processed Marker: ${lastProcessedMarker}`);
      return { syncData, lastProcessedMarker };
    } catch (error) {
      log.error(
        `[${phase}] Error logging sync data: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return { syncData: null, lastProcessedMarker: null };
    }
  };

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring Engine Integrations Sync', () => {
    describe('integrations sync', async () => {
      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta',
          { useCreate: true }
        );
        // Set timestamps to be within last month so they are included in sync (default first run is now - 1M)
        await privMonUtils.integrationsSync.updateIntegrationsUsersWithRelativeTimestamps({
          indexPattern: privMonUtils.integrationsSync.OKTA_INDEX,
        });
        await enablePrivmonSetting(kibanaServer);
        await privMonUtils.initPrivMonEngine();
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta'
        );
        // delete the okta index
        await api.deleteMonitoringEngine({ query: { data: true } });
        await disablePrivmonSetting(kibanaServer);
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
        await privMonUtils.runSync();

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
        privMonUtils.assertIsPrivileged(kathryneBefore, true);
        expect(kathryneBefore?.labels?.source_ids).toContain(monitoringSource?.id);
        expect(kathryneBefore?.labels?.sources).toContain('entity_analytics_integration');
        expect(kathryneBefore?.entity_analytics_monitoring?.labels).toEqual([
          {
            field: 'user.roles',
            source: monitoringSource?.id,
            value: 'Read-only Administrator',
          },
        ]);

        // update okta user to non-privileged, to test sync updates
        await privMonUtils.integrationsSync.setIntegrationUserPrivilege({
          id: privMonUtils.integrationsSync.OKTA_USER_IDS.mable,
          isPrivileged: false,
          indexPattern: privMonUtils.integrationsSync.OKTA_INDEX,
        });
        // schedule another sync
        await privMonUtils.runSync();
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
        log.info(
          '=== STARTING FLAKY TEST: should update and create users within lastProcessedMarker range ==='
        );

        // --- Timestamps
        const nowMinus1M1D = await privMonUtils.integrationsSync.dateOffsetFrom({
          months: 2,
          days: 1,
        });
        const nowMinus2M = await privMonUtils.integrationsSync.dateOffsetFrom({ months: 2 });
        const nowMinus1w = await privMonUtils.integrationsSync.dateOffsetFrom({ days: 7 });
        const nowMinus6d = await privMonUtils.integrationsSync.dateOffsetFrom({ days: 6 });

        log.info('=== TIMESTAMP VALUES ===');
        log.info(`nowMinus1M1D: ${nowMinus1M1D}`);
        log.info(`nowMinus2M: ${nowMinus2M}`);
        log.info(`nowMinus1w: ${nowMinus1w}`);
        log.info(`nowMinus6d: ${nowMinus6d}`);
        log.info(
          `DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP: ${privMonUtils.integrationsSync.DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP}`
        );

        // Log initial state
        log.info('=== INITIAL STATE (before PHASE 1) ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'INITIAL');
        await logUsersFromAPI('INITIAL');
        await logSyncData('INITIAL');

        // PHASE 1: Push two users out of range, sync => expect 4 privileged remain
        log.info('=== PHASE 1: Setting timestamps for devon and elinor ===');
        log.info(
          `Setting devon (${privMonUtils.integrationsSync.OKTA_USER_IDS.devon}) timestamp to: ${nowMinus1M1D}`
        );
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.devon,
          nowMinus1M1D,
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        log.info(
          `Setting elinor (${privMonUtils.integrationsSync.OKTA_USER_IDS.elinor}) timestamp to: ${nowMinus2M}`
        );
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.elinor,
          nowMinus2M,
          privMonUtils.integrationsSync.OKTA_INDEX
        );

        log.info('=== PHASE 1: After setting timestamps, before sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE1_BEFORE_SYNC');

        log.info('=== PHASE 1: Running sync ===');
        await privMonUtils.runSync();

        log.info('=== PHASE 1: After sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE1_AFTER_SYNC');
        const snapA = await privMonUtils.integrationsSync.expectUserCount(4);
        await logUsersFromAPI('PHASE1_AFTER_SYNC');
        await logSyncData('PHASE1_AFTER_SYNC');
        log.info(`PHASE 1: snapA user count: ${snapA.length}`);

        // PHASE 2: Re-run with no changes => no processing, marker should be default (now-1M)
        log.info('=== PHASE 2: Re-running sync with no changes ===');
        log.info('=== PHASE 2: Before sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE2_BEFORE_SYNC');
        await logUsersFromAPI('PHASE2_BEFORE_SYNC');
        await logSyncData('PHASE2_BEFORE_SYNC');

        log.info('=== PHASE 2: Running sync ===');
        await privMonUtils.runSync();

        log.info('=== PHASE 2: After sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE2_AFTER_SYNC');
        const snapB = await privMonUtils.integrationsSync.expectUserCount(4);
        await logUsersFromAPI('PHASE2_AFTER_SYNC');
        await logSyncData('PHASE2_AFTER_SYNC');
        log.info(`PHASE 2: snapB user count: ${snapB.length}`);
        log.info(`PHASE 2: Comparing snapA and snapB sets...`);
        log.info(`PHASE 2: snapA user names: ${snapA.map((u: any) => u.user?.name).join(', ')}`);
        log.info(`PHASE 2: snapB user names: ${snapB.map((u: any) => u.user?.name).join(', ')}`);
        expect(new Set(snapB)).toEqual(new Set(snapA));

        const markerAfterPhase2 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        log.info(`PHASE 2: markerAfterPhase2: ${markerAfterPhase2}`);
        log.info(
          `PHASE 2: Expected marker: ${privMonUtils.integrationsSync.DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP}`
        );
        expect(markerAfterPhase2).toBe(
          privMonUtils.integrationsSync.DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP
        );

        // PHASE 3: Bring one user back in-range, sync => last processed marker updates to that timestamp
        log.info('=== PHASE 3: Bringing kaelyn back in-range ===');
        log.info(
          `Setting kaelyn (${privMonUtils.integrationsSync.OKTA_USER_IDS.kaelyn}) timestamp to: ${nowMinus1w}`
        );
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.kaelyn,
          nowMinus1w,
          privMonUtils.integrationsSync.OKTA_INDEX
        );

        log.info('=== PHASE 3: After setting timestamp, before sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE3_BEFORE_SYNC');
        await logUsersFromAPI('PHASE3_BEFORE_SYNC');
        await logSyncData('PHASE3_BEFORE_SYNC');

        log.info('=== PHASE 3: Running sync ===');
        await privMonUtils.runSync();

        log.info('=== PHASE 3: After sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE3_AFTER_SYNC');
        await logUsersFromAPI('PHASE3_AFTER_SYNC');
        const markerAfterPhase3 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        await logSyncData('PHASE3_AFTER_SYNC');
        log.info(`PHASE 3: markerAfterPhase3: ${markerAfterPhase3}`);
        log.info(`PHASE 3: Expected marker: ${nowMinus1w}`);
        expect(markerAfterPhase3).toBe(nowMinus1w);

        // PHASE 4: Flip a non-privileged user to privileged + in-range, sync => count 5, last processed marker updates
        log.info('=== PHASE 4: Flipping bennett to privileged and setting timestamp ===');
        log.info(
          `Setting bennett (${privMonUtils.integrationsSync.OKTA_USER_IDS.bennett}) to privileged: true, timestamp: ${nowMinus6d}`
        );
        await privMonUtils.integrationsSync.setIntegrationUserPrivilege({
          id: privMonUtils.integrationsSync.OKTA_USER_IDS.bennett,
          isPrivileged: true,
          indexPattern: privMonUtils.integrationsSync.OKTA_INDEX,
        });
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.bennett,
          nowMinus6d,
          privMonUtils.integrationsSync.OKTA_INDEX
        );

        log.info('=== PHASE 4: After setting privilege and timestamp, before sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE4_BEFORE_SYNC');
        await logUsersFromAPI('PHASE4_BEFORE_SYNC');
        await logSyncData('PHASE4_BEFORE_SYNC');

        log.info('=== PHASE 4: Running sync ===');
        await privMonUtils.runSync();

        log.info('=== PHASE 4: After sync ===');
        await logIndexContents(privMonUtils.integrationsSync.OKTA_INDEX, 'PHASE4_AFTER_SYNC');
        await privMonUtils.integrationsSync.expectUserCount(5);
        await logUsersFromAPI('PHASE4_AFTER_SYNC');
        const markerAfterPhase4 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        await logSyncData('PHASE4_AFTER_SYNC');
        log.info(`PHASE 4: markerAfterPhase4: ${markerAfterPhase4}`);
        log.info(`PHASE 4: Expected marker: ${nowMinus6d}`);
        expect(markerAfterPhase4).toBe(nowMinus6d);

        log.info('=== END OF FLAKY TEST ===');
      });

      it('deletes missing users during a full sync window', async () => {
        const EXPECTED_DELETED_USERNAME = 'Mable.Mann';
        // Initial sync to establish users - deletion detection NOT expected
        await privMonUtils.runSync();
        // Create sync window
        await privMonUtils.integrationsSync.createFullSyncWindowFromOffsets();
        // Remove on user from source, simulating deletion
        await privMonUtils.integrationsSync.deleteIntegrationUser({
          id: privMonUtils.integrationsSync.OKTA_USER_IDS.mable,
          indexPattern: privMonUtils.integrationsSync.OKTA_INDEX,
        });
        // Run sync - deletion detection expected to run and remove the user
        await privMonUtils.runSync();
        const users = await privMonUtils.integrationsSync.expectUserCount(6);
        const mable = privMonUtils.findUser(users, EXPECTED_DELETED_USERNAME);
        expect(mable).toBeDefined();
        privMonUtils.assertIsPrivileged(mable, false);
        expect(mable?.entity_analytics_monitoring?.labels).toEqual([]);
        await privMonUtils.integrationsSync.createFullSyncWindowFromOffsets({
          startOffsetMinutes: -40,
          completeOffsetMinutes: -45,
        });
        await privMonUtils.runSync();
        const usersAfter = await privMonUtils.integrationsSync.expectUserCount(6);
        usersAfter.forEach((u: any) => {
          expect(u.user.is_privileged).toBe(false);
        });
        await privMonUtils.integrationsSync.cleanupEventsIndex();
      });
    });
  });
};
