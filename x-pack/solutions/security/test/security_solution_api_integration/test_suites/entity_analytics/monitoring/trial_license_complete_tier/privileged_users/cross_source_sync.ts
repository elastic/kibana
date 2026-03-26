/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import { waitFor } from '@kbn/detections-response-ftr-services';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { PrivMonUtils, PlainIndexSyncUtils } from '../utils';

export default ({ getService }: FtrProviderContext) => {
  const entityAnalyticsApi = getService('entityAnalyticsApi');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');

  // FLAKY: https://github.com/elastic/kibana/issues/237416
  describe.skip('@ess @serverless @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    const index1 = 'privmon_index1';
    const indexSyncUtils = PlainIndexSyncUtils(getService, index1);
    const user1 = { name: 'user_1' };

    after(async () => {
      await entityAnalyticsApi.deleteMonitoringEngine({ query: { data: true } });
    });

    beforeEach(async () => {
      await indexSyncUtils.createIndex();
      await indexSyncUtils.addUsersToIndex([user1.name]);
    });

    afterEach(async () => {
      await indexSyncUtils.deleteIndex();
    });

    it('should merge sources when the same user is added through different methods (API, CSV, index)', async () => {
      await privMonUtils.initPrivMonEngine();

      // Step 1: Add user via API
      await entityAnalyticsApi.createPrivMonUser({
        body: { user: user1 },
      });

      let users = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
        .body as ListPrivMonUsersResponse;
      let user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toEqual(['api']);

      // Step 2: Add same user via CSV upload - should merge sources
      const csvContent = `${user1.name}\n`;
      const csvUploadResponse = await privMonUtils.bulkUploadUsersCsv(csvContent);

      expect(csvUploadResponse.status).toBe(200);
      expect(csvUploadResponse.body.stats.successfulOperations).toBeGreaterThanOrEqual(1);

      users = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
        .body as ListPrivMonUsersResponse;
      user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toContain('api');
      expect(user?.labels?.sources).toContain('csv');

      // Step 3: Add same user via index sync - should merge all three sources
      const createEntitySourceResponse = await entityAnalyticsApi.createEntitySource({
        body: {
          type: 'index',
          name: 'User Monitored Indices - Multi-Source Test',
          indexPattern: index1,
        },
      });

      expect(createEntitySourceResponse.status).toBe(200);
      // Schedule the sync manually instead of using scheduleEngineAndWaitForUserCount
      // because the user count is already 1 (from API/CSV sources), so waiting for count=1
      // would return immediately before the index sync completes
      await privMonUtils.scheduleMonitoringEngineNow({ ignoreConflict: true });

      // Wait for the 'index' source to be merged while also verifying user count stays at 1
      await waitFor(
        async () => {
          const currentUsers = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
            .body as ListPrivMonUsersResponse;
          const currentUser = privMonUtils.findUser(currentUsers, user1.name);
          const sources = currentUser?.labels?.sources || [];
          log.info(`Waiting for 'index' source. Current sources: ${JSON.stringify(sources)}`);
          // Verify user count remains at 1 (no duplicates created) and index source is present
          return currentUsers.length === 1 && sources.includes('index') && sources.length === 3;
        },
        'wait for index source to be merged',
        log
      );

      users = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
        .body as ListPrivMonUsersResponse;
      user = privMonUtils.findUser(users, user1.name);

      expect(users.length).toBe(1); // Verify no duplicate users were created
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toContain('api');
      expect(user?.labels?.sources).toContain('csv');
      expect(user?.labels?.sources).toContain('index');
      expect(user?.labels?.sources).toHaveLength(3);
    });

    it('should handle multiple users with mixed sources correctly', async () => {
      await privMonUtils.initPrivMonEngine();
      const user2 = { name: 'user_2' };
      const user3 = { name: 'user_3' };

      // Create user1 via API
      await entityAnalyticsApi.createPrivMonUser({
        body: { user: user1 },
      });
      // Create user2 via API
      await entityAnalyticsApi.createPrivMonUser({
        body: { user: user2 },
      });
      // Add user1 (update) and user3 (new) via CSV
      const csvContent = `${user1.name}\n${user3.name}\n`;
      await privMonUtils.bulkUploadUsersCsv(csvContent);

      // Verify final state
      const users = (await entityAnalyticsApi.listPrivMonUsers({ query: {} }))
        .body as ListPrivMonUsersResponse;
      expect(users.length).toBe(3);

      const foundUser1 = privMonUtils.findUser(users, user1.name);
      const foundUser2 = privMonUtils.findUser(users, user2.name);
      const foundUser3 = privMonUtils.findUser(users, user3.name);

      // user1 should have both API and CSV sources
      privMonUtils.assertIsPrivileged(foundUser1, true);
      expect(foundUser1?.labels?.sources).toContain('api');
      expect(foundUser1?.labels?.sources).toContain('csv');

      // user2 should remain as API only (CSV upload doesn't affect API-only users)
      privMonUtils.assertIsPrivileged(foundUser2, true);
      expect(foundUser2?.labels?.sources).toEqual(['api']);

      // user3 should be CSV only
      privMonUtils.assertIsPrivileged(foundUser3, true);
      expect(foundUser3?.labels?.sources).toEqual(['csv']);
    });
  });
};
