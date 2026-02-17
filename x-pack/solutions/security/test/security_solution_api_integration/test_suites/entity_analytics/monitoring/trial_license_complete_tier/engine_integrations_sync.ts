/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const esArchiver = getService('esArchiver');
  const privMonUtils = PrivMonUtils(getService);

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
        await privMonUtils.initPrivMonEngine();
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/privileged_monitoring/integrations/okta'
        );
        // delete the okta index
        await api.deleteMonitoringEngine({ query: { data: true } });
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
        // --- Timestamps
        const nowMinus1M1D = await privMonUtils.integrationsSync.dateOffsetFrom({
          months: 2,
          days: 1,
        });
        const nowMinus2M = await privMonUtils.integrationsSync.dateOffsetFrom({ months: 2 });
        const nowMinus1w = await privMonUtils.integrationsSync.dateOffsetFrom({ days: 7 });
        const nowMinus6d = await privMonUtils.integrationsSync.dateOffsetFrom({ days: 6 });
        // PHASE 1: Push two users out of range, sync => expect 4 privileged remain
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.devon,
          nowMinus1M1D,
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.elinor,
          nowMinus2M,
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        const snapA = await privMonUtils.scheduleEngineAndWaitForUserCount(4);

        // PHASE 2: Re-run with no changes => no processing, marker should be default (now-1M)
        const snapB = await privMonUtils.scheduleEngineAndWaitForUserCount(4);
        expect(new Set(snapB)).toEqual(new Set(snapA));

        const markerAfterPhase2 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        expect(markerAfterPhase2).toBe(
          privMonUtils.integrationsSync.DEFAULT_INTEGRATIONS_RELATIVE_TIMESTAMP
        );

        // PHASE 3: Bring one user back in-range, sync => last processed marker updates to that timestamp
        await privMonUtils.integrationsSync.setTimestamp(
          privMonUtils.integrationsSync.OKTA_USER_IDS.kaelyn,
          nowMinus1w,
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        await privMonUtils.scheduleEngineAndWaitForUserCount(4);
        const markerAfterPhase3 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        expect(markerAfterPhase3).toBe(nowMinus1w);

        // PHASE 4: Flip a non-privileged user to privileged + in-range, sync => count 5, last processed marker updates
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

        await privMonUtils.scheduleEngineAndWaitForUserCount(5);

        const markerAfterPhase4 = await privMonUtils.integrationsSync.getLastProcessedMarker(
          privMonUtils.integrationsSync.OKTA_INDEX
        );
        expect(markerAfterPhase4).toBe(nowMinus6d);
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
