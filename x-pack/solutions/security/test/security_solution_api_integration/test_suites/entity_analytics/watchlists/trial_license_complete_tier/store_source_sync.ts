/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils } from './utils/entity_store_utils';
import { WatchlistSyncUtils } from './utils/watchlist_sync_utils';

const userEuid = (name: string) => `user:${name}@unknown`;

export default ({ getService }: FtrProviderContext) => {
  const entityAnalyticsApi = getService('entityAnalyticsApi');

  describe('@ess @serverless @skipInServerlessMKI Store Source Sync', () => {
    const entityStore = EntityStoreUtils(getService);
    const utils = WatchlistSyncUtils(getService);

    before(async () => {
      await utils.cleanWatchlistState();
      await entityStore.install(['user']);
    });

    after(async () => {
      await entityStore.uninstall();
    });

    afterEach(async () => {
      await entityStore.clearAllEntityStoreData();
      await utils.cleanWatchlistState();
    });

    it('should sync entities from the entity store matching a KQL query rule', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'store-sync-all-users', description: '', riskModifier: 1 },
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

      await entityAnalyticsApi.createWatchlistEntitySource({
        params: { watchlist_id: watchlistId },
        body: {
          type: 'store',
          name: 'All users from store',
          queryRule: 'entity.type: "user"',
          enabled: true,
        },
      });

      await utils.syncWatchlist(watchlistId);

      const euids = (await utils.queryWatchlistIndex(watchlistId)).map(
        (e) => (e.entity as { id: string }).id
      );
      expect(euids).toHaveLength(2);
      expect(euids).toContain(userEuid('alice'));
      expect(euids).toContain(userEuid('bob'));
    });

    it('should only sync entities matching a more specific KQL query rule', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'store-sync-filtered', description: '', riskModifier: 1 },
      });
      const watchlistId = watchlist.id;

      await entityStore.createEntity('user', {
        user: { name: 'alice', email: ['alice@corp.com'] },
        entity: { id: 'user:alice@corp.com@unknown', type: 'user' },
      });
      await entityStore.createEntity('user', {
        user: { name: 'guest' },
        entity: { id: userEuid('guest'), type: 'user' },
      });

      await entityAnalyticsApi.createWatchlistEntitySource({
        params: { watchlist_id: watchlistId },
        body: {
          type: 'store',
          name: 'Corp email users only',
          queryRule: 'user.email: "alice@corp.com"',
          enabled: true,
        },
      });

      await utils.syncWatchlist(watchlistId);

      const euids = (await utils.queryWatchlistIndex(watchlistId)).map(
        (e) => (e.entity as { id: string }).id
      );
      expect(euids).toHaveLength(1);
      expect(euids).toContain('user:alice@corp.com@unknown');
      expect(euids).not.toContain(userEuid('guest'));
    });
  });
};
