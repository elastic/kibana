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
  const supertest = getService('supertest');

  describe('@ess @serverless @skipInServerlessMKI Watchlist Lifecycle', () => {
    const sourceIndexName = 'watchlist-lifecycle-test-users';
    const utils = WatchlistSyncUtils(getService, [sourceIndexName]);
    const entityStore = EntityStoreUtils(getService);

    const deleteWatchlist = (id: string) =>
      supertest
        .delete(`/api/entity_analytics/watchlists/${id}`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

    before(async () => {
      await utils.cleanWatchlistState();
      await entityStore.install(['user']);
    });

    after(async () => {
      await entityStore.uninstall();
    });

    afterEach(async () => {
      await utils.deleteAllSourceIndices();
      await entityStore.clearAllEntityStoreData();
      await utils.cleanWatchlistState();
    });

    it('should remove all entities from the watchlist index when the watchlist is deleted', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'lifecycle-delete',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });
      await entityStore.createEntity('user', {
        user: { name: 'bob' },
        entity: { id: userEuid('bob'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['alice', 'bob'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);
      expect(await utils.queryWatchlistIndex(watchlistId)).toHaveLength(2);

      await deleteWatchlist(watchlistId);
      expect(await utils.queryWatchlistIndex(watchlistId)).toHaveLength(0);
    });

    it('should remove the watchlist id from entity.attributes.watchlists when the watchlist is deleted', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'lifecycle-store-cleanup',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['alice'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      expect(await entityStore.getEntityWatchlists(userEuid('alice'))).toContain(watchlistId);

      await deleteWatchlist(watchlistId);

      expect(await entityStore.getEntityWatchlists(userEuid('alice'))).not.toContain(watchlistId);
    });

    it('should keep an entity in the watchlist index when it belongs to multiple watchlists and only one is deleted', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId: wlId1 } = await utils.createWatchlistAndEntitySource(
        'lifecycle-multi-1',
        sourceIndexName
      );
      const { watchlistId: wlId2 } = await utils.createWatchlistAndEntitySource(
        'lifecycle-multi-2',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['alice'], sourceIndexName);
      await utils.syncWatchlist(wlId1);
      await utils.syncWatchlist(wlId2);

      expect(await utils.queryWatchlistIndex(wlId1)).toHaveLength(1);
      expect(await utils.queryWatchlistIndex(wlId2)).toHaveLength(1);

      await deleteWatchlist(wlId1);

      expect(await utils.queryWatchlistIndex(wlId1)).toHaveLength(0);
      expect(await utils.queryWatchlistIndex(wlId2)).toHaveLength(1);
    });
  });
};
