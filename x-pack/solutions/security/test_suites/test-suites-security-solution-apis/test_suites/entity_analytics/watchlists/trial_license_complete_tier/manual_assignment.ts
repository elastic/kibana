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
  const entityAnalyticsApi = getService('entityAnalyticsApi');

  describe('@ess @serverless @skipInServerlessMKI Manual Entity Assignment', () => {
    const sourceIndexName = 'watchlist-manual-test-users';
    const utils = WatchlistSyncUtils(getService, [sourceIndexName]);
    const entityStore = EntityStoreUtils(getService);

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

    it('should add entities to the watchlist when assigned manually', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'manual-assign', description: '', riskModifier: 1 },
      });
      const watchlistId = watchlist.id;

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });
      await entityStore.createEntity('user', {
        user: { name: 'bob' },
        entity: { id: userEuid('bob'), type: 'user' },
      });

      const response = await entityAnalyticsApi.assignWatchlistEntities({
        params: { watchlist_id: watchlistId },
        body: { euids: [userEuid('alice'), userEuid('bob')] },
      });
      expect(response.status).toBe(200);

      const euids = (await utils.queryWatchlistIndex(watchlistId)).map(
        (e) => (e.entity as { id: string }).id
      );
      expect(euids).toContain(userEuid('alice'));
      expect(euids).toContain(userEuid('bob'));
    });

    it('should remove entities from the watchlist when unassigned', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'manual-unassign', description: '', riskModifier: 1 },
      });
      const watchlistId = watchlist.id;

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });

      await entityAnalyticsApi.assignWatchlistEntities({
        params: { watchlist_id: watchlistId },
        body: { euids: [userEuid('alice')] },
      });
      expect(await utils.queryWatchlistIndex(watchlistId)).toHaveLength(1);

      const unassignResponse = await entityAnalyticsApi.unassignWatchlistEntities({
        params: { watchlist_id: watchlistId },
        body: { euids: [userEuid('alice')] },
      });
      expect(unassignResponse.status).toBe(200);
      expect(await utils.queryWatchlistIndex(watchlistId)).toHaveLength(0);
    });

    it('should not remove manually assigned entities during a sync cycle', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'manual-survives-sync',
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

      // bob comes from the index source; alice is manually assigned
      await utils.addUsersToSourceIndex(['bob'], sourceIndexName);
      await entityAnalyticsApi.assignWatchlistEntities({
        params: { watchlist_id: watchlistId },
        body: { euids: [userEuid('alice')] },
      });

      await utils.syncWatchlist(watchlistId);

      const euidsAfterSync = (await utils.queryWatchlistIndex(watchlistId)).map(
        (e) => (e.entity as { id: string }).id
      );
      expect(euidsAfterSync).toContain(userEuid('alice'));
      expect(euidsAfterSync).toContain(userEuid('bob'));

      // Remove bob from source and re-sync — alice should survive
      await utils.clearSourceIndex(sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const euidsAfterResync = (await utils.queryWatchlistIndex(watchlistId)).map(
        (e) => (e.entity as { id: string }).id
      );
      expect(euidsAfterResync).toContain(userEuid('alice'));
      expect(euidsAfterResync).not.toContain(userEuid('bob'));
    });

    it('should report not_found for euids that do not exist in the entity store', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'manual-not-found', description: '', riskModifier: 1 },
      });
      const watchlistId = watchlist.id;

      const response = await entityAnalyticsApi.assignWatchlistEntities({
        params: { watchlist_id: watchlistId },
        body: { euids: ['user:nonexistent@unknown'] },
      });
      expect(response.status).toBe(200);
      expect(response.body.not_found).toBe(1);
    });
  });
};
