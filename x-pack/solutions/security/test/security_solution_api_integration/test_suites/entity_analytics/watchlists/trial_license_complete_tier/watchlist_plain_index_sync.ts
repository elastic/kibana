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

  describe.skip('@ess @serverless @skipInServerlessMKI Watchlist Plain Index Sync', () => {
    const sourceIndexName = 'watchlist-sync-test-users';
    const utils = WatchlistSyncUtils(getService, [sourceIndexName]);
    const entityStore = EntityStoreUtils(getService);

    const cleanAllWatchlistState = async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.clean({ types: ['watchlist-entity-source'] });
    };

    before(async () => {
      await cleanAllWatchlistState();
      await entityStore.install(['user']);
    });

    after(async () => {
      await entityStore.uninstall();
    });

    afterEach(async () => {
      await utils.deleteAllSourceIndices();
      await cleanAllWatchlistState();
    });

    it('should sync users from a source index into the watchlist entity index', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'sync-test-list',
        sourceIndexName
      );

      const usernames = ['alice', 'bob', 'charlie'];
      for (const name of usernames) {
        await entityStore.createEntity('user', {
          user: { name },
          entity: { id: userEuid(name), type: 'user' },
        });
      }

      await utils.addUsersToSourceIndex(usernames, sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistId);
      expect(entities).toHaveLength(3);

      const euids = entities.map((e) => (e.entity as { id: string }).id);
      expect(euids).toContain(userEuid('alice'));
      expect(euids).toContain(userEuid('bob'));
      expect(euids).toContain(userEuid('charlie'));
    });

    it('should not create duplicate users', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'sync-test-no-duplicates',
        sourceIndexName
      );

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
          entity: { id: userEuid(name), type: 'user' },
        });
      }

      const repeatedUsers = Array.from({ length: 150 }).map(() => 'C-3PO');
      await utils.addUsersToSourceIndex([...uniqueUsernames, ...repeatedUsers], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistId);
      expect(entities).toHaveLength(uniqueUsernames.length);

      const euids = entities.map((e) => (e.entity as { id: string }).id);
      expect(euids).toContain(userEuid('Luke Skywalker'));
      expect(euids).toContain(userEuid('C-3PO'));
      expect(euids.filter((euid: string) => euid === userEuid('C-3PO'))).toHaveLength(1);
    });

    it('should exclude documents outside the lookback period', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'sync-test-short-lookback',
        sourceIndexName,
        { start: 'now-1d', end: 'now' }
      );

      await entityStore.createEntity('user', {
        user: { name: 'recent-user' },
        entity: { id: userEuid('recent-user'), type: 'user' },
      });
      await entityStore.createEntity('user', {
        user: { name: 'old-user' },
        entity: { id: userEuid('old-user'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['recent-user'], sourceIndexName, new Date().toISOString());

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      await utils.addUsersToSourceIndex(['old-user'], sourceIndexName, oldDate.toISOString());

      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistId);
      const euids = entities.map((e) => (e.entity as { id: string }).id);

      expect(euids).toContain(userEuid('recent-user'));
      expect(euids).not.toContain(userEuid('old-user'));
    });

    it('should not update timestamps when re-syncing the same user', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'sync-test-no-timestamp-update',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'user1' },
        entity: { id: userEuid('user1'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['user1'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const entitiesAfterFirstSync = await utils.queryWatchlistIndex(watchlistId);
      const user1AfterFirstSync = utils.findEntity(entitiesAfterFirstSync, userEuid('user1'));
      log.info(`User 1 after first sync: ${JSON.stringify(user1AfterFirstSync)}`);

      await utils.syncWatchlist(watchlistId);

      const entitiesAfterSecondSync = await utils.queryWatchlistIndex(watchlistId);
      const user1AfterSecondSync = utils.findEntity(entitiesAfterSecondSync, userEuid('user1'));
      log.info(`User 1 after second sync: ${JSON.stringify(user1AfterSecondSync)}`);

      expect(user1AfterSecondSync?.['@timestamp']).toEqual(user1AfterFirstSync?.['@timestamp']);
      expect((user1AfterSecondSync?.event as { ingested: string })?.ingested).toEqual(
        (user1AfterFirstSync?.event as { ingested: string })?.ingested
      );
    });

    it('should resolve all entity store entities sharing a correlation value', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'sync-test-correlation',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'jdoe', email: ['jdoe@corp.com'] },
        entity: { id: 'user:jdoe@corp.com@unknown', type: 'user' },
      });
      await entityStore.createEntity('user', {
        user: { name: 'jdoe' },
        entity: { id: userEuid('jdoe'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['jdoe'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const entities = await utils.queryWatchlistIndex(watchlistId);
      const euids = entities.map((e) => (e.entity as { id: string }).id);

      expect(euids).toContain('user:jdoe@corp.com@unknown');
      expect(euids).toContain(userEuid('jdoe'));
      expect(entities).toHaveLength(2);
    });
  });
};
