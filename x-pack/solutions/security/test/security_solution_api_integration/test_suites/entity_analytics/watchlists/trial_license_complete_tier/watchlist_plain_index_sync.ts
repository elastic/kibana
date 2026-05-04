/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { WatchlistSyncUtils } from './utils/watchlist_sync_utils';
import { EntityStoreUtils } from './utils/entity_store_utils';

const userEuid = (name: string) => `user:${name}@unknown`;

export default ({ getService }: FtrProviderContext) => {
  const log = getService('log');
  const kibanaServer = getService('kibanaServer');

  describe('@ess @serverless @skipInServerlessMKI Watchlist Plain Index Sync', () => {
    const sourceIndexName = 'watchlist-sync-test-users';
    const watchlistName = 'sync-test-list';
    const utils = WatchlistSyncUtils(getService, sourceIndexName);
    const entityStore = EntityStoreUtils(getService);

    let watchlistId: string;

    before(async () => {
      await entityStore.install(['user']);
    });

    after(async () => {
      await entityStore.uninstall();
    });

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

      for (const name of usernames) {
        await entityStore.createEntity('user', {
          user: { name },
          entity: { id: userEuid(name) },
        });
      }

      await utils.addUsersToSourceIndex(usernames);
      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistName);
      expect(entities).toHaveLength(3);

      const euids = entities.map((e) => (e.entity as { id: string }).id);
      expect(euids).toContain(userEuid('alice'));
      expect(euids).toContain(userEuid('bob'));
      expect(euids).toContain(userEuid('charlie'));
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

      for (const name of uniqueUsernames) {
        await entityStore.createEntity('user', {
          user: { name },
          entity: { id: userEuid(name) },
        });
      }

      const repeatedUsers = Array.from({ length: 150 }).map(() => 'C-3PO');
      await utils.addUsersToSourceIndex([...uniqueUsernames, ...repeatedUsers]);
      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistName);
      expect(entities).toHaveLength(uniqueUsernames.length);

      const euids = entities.map((e) => (e.entity as { id: string }).id);
      expect(euids).toContain(userEuid('Luke Skywalker'));
      expect(euids).toContain(userEuid('C-3PO'));
      expect(euids.filter((euid: string) => euid === userEuid('C-3PO'))).toHaveLength(1);
    });

    it('should exclude documents outside the lookback period', async () => {
      const shortLookbackName = 'sync-test-short-lookback';
      const shortResult = await utils.createWatchlistAndEntitySource(shortLookbackName, {
        start: 'now-1d',
        end: 'now',
      });

      await entityStore.createEntity('user', {
        user: { name: 'recent-user' },
        entity: { id: userEuid('recent-user') },
      });
      await entityStore.createEntity('user', {
        user: { name: 'old-user' },
        entity: { id: userEuid('old-user') },
      });

      await utils.addUsersToSourceIndex(['recent-user'], new Date().toISOString());

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      await utils.addUsersToSourceIndex(['old-user'], oldDate.toISOString());

      await utils.syncWatchlist(shortResult.watchlistId);

      const entities = await utils.queryWatchlistIndex(shortLookbackName);
      const euids = entities.map((e) => (e.entity as { id: string }).id);

      expect(euids).toContain(userEuid('recent-user'));
      expect(euids).not.toContain(userEuid('old-user'));

      await utils.deleteWatchlistIndex(shortLookbackName);
    });

    it('should not update timestamps when re-syncing the same user', async () => {
      await entityStore.createEntity('user', {
        user: { name: 'user1' },
        entity: { id: userEuid('user1') },
      });

      await utils.addUsersToSourceIndex(['user1']);
      await utils.syncWatchlist(watchlistId);

      const entitiesAfterFirstSync = await utils.queryWatchlistIndex(watchlistName);
      const user1AfterFirstSync = utils.findEntity(entitiesAfterFirstSync, userEuid('user1'));
      log.info(`User 1 after first sync: ${JSON.stringify(user1AfterFirstSync)}`);

      await utils.syncWatchlist(watchlistId);

      const entitiesAfterSecondSync = await utils.queryWatchlistIndex(watchlistName);
      const user1AfterSecondSync = utils.findEntity(entitiesAfterSecondSync, userEuid('user1'));
      log.info(`User 1 after second sync: ${JSON.stringify(user1AfterSecondSync)}`);

      expect(user1AfterSecondSync?.['@timestamp']).toEqual(user1AfterFirstSync?.['@timestamp']);
      expect((user1AfterSecondSync?.event as { ingested: string })?.ingested).toEqual(
        (user1AfterFirstSync?.event as { ingested: string })?.ingested
      );
    });

    it('should resolve all entity store entities sharing a correlation value', async () => {
      await entityStore.createEntity('user', {
        user: { name: 'jdoe', email: ['jdoe@corp.com'] },
        entity: { id: 'user:jdoe@corp.com@unknown' },
      });
      await entityStore.createEntity('user', {
        user: { name: 'jdoe' },
        entity: { id: userEuid('jdoe') },
      });

      await utils.addUsersToSourceIndex(['jdoe']);
      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistName);
      const euids = entities.map((e) => (e.entity as { id: string }).id);

      expect(euids).toContain('user:jdoe@corp.com@unknown');
      expect(euids).toContain(userEuid('jdoe'));
      expect(entities).toHaveLength(2);
    });
  });
};
