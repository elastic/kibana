/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils, PlainIndexSyncUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const privMonUtils = PrivMonUtils(getService);
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Entity Privilege Monitoring Engine Plain Index Sync', () => {
    describe('Plain index sync', () => {
      const indexName = 'tatooine-privileged-users';
      const indexSyncUtils = PlainIndexSyncUtils(getService, indexName);

      beforeEach(async () => {
        await indexSyncUtils.createIndex();
        await privMonUtils.initPrivMonEngine();
      });

      afterEach(async () => {
        await indexSyncUtils.deleteIndex();
        await api.deleteMonitoringEngine({ query: { data: true } });
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
        // add user to incoming index, for monitoring source
        await indexSyncUtils.addUsersToIndex(['user1', 'user2']);
        await indexSyncUtils.createEntitySourceForIndex();
        // users from internal index
        const usersBefore = await privMonUtils.scheduleEngineAndWaitForUserCount(2);

        // find user1 in internal index
        const user1Before = privMonUtils.findUser(usersBefore, 'user1');
        log.info(`User 1 before: ${JSON.stringify(user1Before)}`);
        // delete from incoming index (tatooine-privileged-users)
        await indexSyncUtils.deleteUserFromIndex('user1');
        // add a new user so we know when the task completes - tatooine-privileged-users now has only 'user2' and 'user3'
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
  });
};
