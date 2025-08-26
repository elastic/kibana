/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/users/list.gen';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const es = getService('es');
  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    const kibanaServer = getService('kibanaServer');
    const index1 = 'privmon_index1';
    const user1 = { name: 'user_1' };

    before(async () => {
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await api.deleteMonitoringEngine({ query: { data: true } });
      await disablePrivmonSetting(kibanaServer);
    });

    beforeEach(async () => {
      await privMonUtils.createSourceIndex(index1);

      await es.index({
        index: index1,
        body: { user: user1 },
        refresh: 'wait_for',
      });
    });

    afterEach(async () => {
      await es.indices.delete({ index: index1 });
    });

    it('should update a user when it was already added by API', async () => {
      await privMonUtils.initPrivMonEngine();

      // First add user via API
      await api.createPrivMonUser({
        body: { user: user1 },
      });

      const createEntitySourceResponse = await api.createEntitySource({
        body: {
          type: 'index',
          name: 'User Monitored Indices - API Update Test',
          indexPattern: index1,
        },
      });

      expect(createEntitySourceResponse.status).toBe(200);

      await privMonUtils.waitForSyncTaskRun();

      const users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      const user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toEqual(['api', 'index']);
    });

    it('should update a user when it was already added by index sync', async () => {
      await privMonUtils.initPrivMonEngine();

      // First add user via index sync
      const createEntitySourceResponse = await api.createEntitySource({
        body: {
          type: 'index',
          name: 'User Monitored Indices - Index Update Test',
          indexPattern: index1,
        },
      });

      expect(createEntitySourceResponse.status).toBe(200);
      await privMonUtils.waitForSyncTaskRun();

      // Verify user exists from index source
      let users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      let user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toEqual(['index']);

      // Then add same user via API - should update with merged sources
      await api.createPrivMonUser({
        body: { user: user1 },
      });

      users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toContain('index');
      expect(user?.labels?.sources).toContain('api');
    });

    it('should update a user when it was already added by CSV upload', async () => {
      await privMonUtils.initPrivMonEngine();

      // Create a CSV with the user
      const csvContent = `${user1.name}\n`;

      // Upload CSV first
      const csvUploadResponse = await privMonUtils.bulkUploadUsersCsv(csvContent);

      expect(csvUploadResponse.status).toBe(200);
      expect(csvUploadResponse.body.stats.successful).toBe(1);

      // Verify user exists from CSV source
      let users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      let user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toEqual(['csv']);

      // Then add same user via API - should update with merged sources
      await api.createPrivMonUser({
        body: { user: user1 },
      });

      users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toContain('csv');
      expect(user?.labels?.sources).toContain('api');
    });

    it('should update a user when it was already added by API and then uploaded via CSV', async () => {
      await privMonUtils.initPrivMonEngine();

      // First add user via API
      await api.createPrivMonUser({
        body: { user: user1 },
      });

      // Verify user exists from API source
      let users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      let user = privMonUtils.findUser(users, user1.name);
      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toEqual(['api']);

      // Then upload same user via CSV - should update with merged sources
      const csvContent = `${user1.name}\n`;

      const csvUploadResponse = await privMonUtils.bulkUploadUsersCsv(csvContent);

      expect(csvUploadResponse.status).toBe(200);
      // CSV upload successful count includes both user processing and soft-delete operations
      // It should be at least 1 (the user we uploaded), but may include soft-deletes of other users
      expect(csvUploadResponse.body.stats.successful).toBeGreaterThanOrEqual(1);

      users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      user = privMonUtils.findUser(users, user1.name);

      privMonUtils.assertIsPrivileged(user, true);
      expect(user?.user?.name).toEqual(user1.name);
      expect(user?.labels?.sources).toContain('api');
      expect(user?.labels?.sources).toContain('csv');
    });

    it('should handle complex operations with mixed API and CSV users correctly', async () => {
      await privMonUtils.initPrivMonEngine();

      const user2 = { name: 'user_2' };
      const user3 = { name: 'user_3' };

      // Create user1 via API
      const createResponse = await api.createPrivMonUser({
        body: {
          user: { name: user1.name },
        },
      });
      expect(createResponse.status).toBe(201);

      // Create user2 via API
      const create2Response = await api.createPrivMonUser({
        body: {
          user: { name: user2.name },
        },
      });
      expect(create2Response.status).toBe(201);

      // Add user3 via CSV (which should also update any existing users)
      const csvContent = `${user1.name}
${user3.name}
`;

      const csvUploadResponse = await privMonUtils.bulkUploadUsersCsv(csvContent);

      expect(csvUploadResponse.status).toBe(200);
      expect(csvUploadResponse.body.stats.successful).toBe(2); // 1 updated, 1 created

      // Verify final state
      const users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      expect(users.length).toBe(3);

      const foundUser1 = privMonUtils.findUser(users, user1.name);
      const foundUser2 = privMonUtils.findUser(users, user2.name);
      const foundUser3 = privMonUtils.findUser(users, user3.name);

      // user1 should now have both API and CSV sources
      privMonUtils.assertIsPrivileged(foundUser1, true);
      expect(foundUser1?.labels?.sources).toEqual(['api', 'csv']);

      // user2 should remain as API only and privileged
      privMonUtils.assertIsPrivileged(foundUser2, true);
      expect(foundUser2?.labels?.sources).toEqual(['api']);

      // user3 should be CSV only
      privMonUtils.assertIsPrivileged(foundUser3, true);
      expect(foundUser3?.labels?.sources).toEqual(['csv']);
    });

    it('should maintain username uniqueness across multiple CSV uploads with different users', async () => {
      await privMonUtils.initPrivMonEngine();

      const user2 = { name: 'user_2' };
      const user3 = { name: 'user_3' };

      // First CSV upload with user1 and user2
      const csvContent1 = `${user1.name}\n${user2.name}\n`;

      const csvUploadResponse1 = await privMonUtils.bulkUploadUsersCsv(csvContent1);

      expect(csvUploadResponse1.status).toBe(200);
      expect(csvUploadResponse1.body.stats.successful).toBe(2);

      // Verify both users exist
      let users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      expect(users.length).toBe(2);

      let foundUser1 = privMonUtils.findUser(users, user1.name);
      let foundUser2 = privMonUtils.findUser(users, user2.name);

      expect(foundUser1?.labels?.sources).toEqual(['csv']);
      expect(foundUser2?.labels?.sources).toEqual(['csv']);

      // Second CSV upload with user1 (duplicate) and user3 (new)
      const csvContent2 = `${user1.name}\n${user3.name}\n`;

      const csvUploadResponse2 = await privMonUtils.bulkUploadUsersCsv(csvContent2);

      expect(csvUploadResponse2.status).toBe(200);
      expect(csvUploadResponse2.body.stats.successful).toBe(2); // 1 updated, 1 created

      // Verify final state: user1 still exists (updated), user2 soft-deleted, user3 created
      users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;

      foundUser1 = privMonUtils.findUser(users, user1.name);
      foundUser2 = privMonUtils.findUser(users, user2.name);
      const foundUser3 = privMonUtils.findUser(users, user3.name);

      // user1 should still be privileged
      privMonUtils.assertIsPrivileged(foundUser1, true);
      expect(foundUser1?.labels?.sources).toEqual(['csv']);

      // user2 should be soft-deleted (is_privileged: false)
      privMonUtils.assertIsPrivileged(foundUser2, false);

      // user3 should be newly created
      privMonUtils.assertIsPrivileged(foundUser3, true);
      expect(foundUser3?.labels?.sources).toEqual(['csv']);
    });

    it('should handle username uniqueness when mixing API creation and CSV upload with duplicates', async () => {
      await privMonUtils.initPrivMonEngine();

      const user2 = { name: 'user_2' };

      // Create user1 via API
      await api.createPrivMonUser({
        body: { user: user1 },
      });

      // Create user2 via API
      await api.createPrivMonUser({
        body: { user: user2 },
      });

      let users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;
      expect(users.length).toBe(2);

      // Upload CSV with user1 (existing) and user3 (new)
      const user3 = { name: 'user_3' };
      const csvContent = `${user1.name}\n${user3.name}\n`;

      const csvUploadResponse = await privMonUtils.bulkUploadUsersCsv(csvContent);

      expect(csvUploadResponse.status).toBe(200);
      expect(csvUploadResponse.body.stats.successful).toBe(2);

      // Final verification
      users = (await api.listPrivMonUsers({ query: {} })).body as ListPrivMonUsersResponse;

      const foundUser1 = privMonUtils.findUser(users, user1.name);
      const foundUser2 = privMonUtils.findUser(users, user2.name);
      const foundUser3 = privMonUtils.findUser(users, user3.name);

      // user1 should have both API and CSV sources
      privMonUtils.assertIsPrivileged(foundUser1, true);
      expect(foundUser1?.labels?.sources).toContain('api');
      expect(foundUser1?.labels?.sources).toContain('csv');

      // user2 should be soft-deleted (was not in CSV)
      privMonUtils.assertIsPrivileged(foundUser2, false);
      expect(foundUser2?.labels?.sources).toEqual(['api']);

      // user3 should be newly created from CSV
      privMonUtils.assertIsPrivileged(foundUser3, true);
      expect(foundUser3?.labels?.sources).toEqual(['csv']);
    });
  });
};
