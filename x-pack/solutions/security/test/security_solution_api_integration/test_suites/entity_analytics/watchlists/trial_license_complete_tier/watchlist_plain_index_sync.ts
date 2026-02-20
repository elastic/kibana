/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { WatchlistSyncUtils } from './utils/watchlist_sync_utils';

export default ({ getService }: FtrProviderContext) => {
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('@ess @serverless @skipInServerlessMKI Watchlist Plain Index Sync', () => {
    const sourceIndexName = 'watchlist-sync-test-users';
    const watchlistName = 'sync-test-list';
    const utils = WatchlistSyncUtils(getService, sourceIndexName);

    let watchlistId: string;

    beforeEach(async () => {
      await utils.createSourceIndex();
      const result = await utils.createWatchlistAndEntitySource(watchlistName);
      watchlistId = result.watchlistId;
    });

    afterEach(async () => {
      await utils.deleteSourceIndex();
      await utils.deleteWatchlistIndex(watchlistName);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should sync users from a source index into the watchlist entity index', async () => {
      const usernames = ['alice', 'bob', 'charlie'];
      await utils.addUsersToSourceIndex(usernames);

      await utils.syncWatchlist(watchlistId);

      const users = await utils.queryWatchlistIndex(watchlistName);
      expect(users).toHaveLength(3);

      const names = users.map((u) => (u.user as { name: string }).name);
      expect(names).toContain('alice');
      expect(names).toContain('bob');
      expect(names).toContain('charlie');
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

      await utils.addUsersToSourceIndex([...uniqueUsernames, ...repeatedUsers]);
      await utils.syncWatchlist(watchlistId);

      const users = await utils.queryWatchlistIndex(watchlistName);
      expect(users).toHaveLength(uniqueUsernames.length);

      const names = users.map((u) => (u.user as { name: string }).name);
      expect(names).toContain('Luke Skywalker');
      expect(names).toContain('C-3PO');
      expect(names.filter((name: string) => name === 'C-3PO')).toHaveLength(1);
    });

    it('should not update timestamps when re-syncing the same user', async () => {
      await utils.addUsersToSourceIndex(['user1']);
      await utils.syncWatchlist(watchlistId);

      const usersAfterFirstSync = await utils.queryWatchlistIndex(watchlistName);
      const user1AfterFirstSync = utils.findUser(usersAfterFirstSync, 'user1');
      log.info(`User 1 after first sync: ${JSON.stringify(user1AfterFirstSync)}`);

      await utils.syncWatchlist(watchlistId);

      const usersAfterSecondSync = await utils.queryWatchlistIndex(watchlistName);
      const user1AfterSecondSync = utils.findUser(usersAfterSecondSync, 'user1');
      log.info(`User 1 after second sync: ${JSON.stringify(user1AfterSecondSync)}`);

      expect(user1AfterSecondSync?.['@timestamp']).toEqual(user1AfterFirstSync?.['@timestamp']);
      expect((user1AfterSecondSync?.event as { ingested: string })?.ingested).toEqual(
        (user1AfterFirstSync?.event as { ingested: string })?.ingested
      );
    });
  });
};
