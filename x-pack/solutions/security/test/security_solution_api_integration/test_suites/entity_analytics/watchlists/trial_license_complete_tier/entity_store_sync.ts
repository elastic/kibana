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

const FAKE_WATCHLIST_ID = 'fake-pre-existing-watchlist-id';

export default ({ getService }: FtrProviderContext) => {
  describe('@ess @serverless @skipInServerlessMKI Entity Store Attribute Sync', () => {
    const sourceIndexName = 'watchlist-entity-store-sync-test-users';
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

    it('should add the watchlist id to entity.attributes.watchlists after sync', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'attr-sync-add',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });

      await utils.addUsersToSourceIndex(['alice'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const watchlists = await entityStore.getEntityWatchlists(userEuid('alice'));
      expect(watchlists).toContain(watchlistId);
    });

    it('should remove the watchlist id from entity.attributes.watchlists on deletion but preserve other ids', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'attr-sync-remove',
        sourceIndexName
      );

      // Pre-seed alice with a fake watchlist id to verify it is preserved after removal
      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: {
          id: userEuid('alice'),
          type: 'user',
          attributes: { watchlists: [FAKE_WATCHLIST_ID] },
        },
      });

      await utils.addUsersToSourceIndex(['alice'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const watchlistsAfterSync = await entityStore.getEntityWatchlists(userEuid('alice'));
      expect(watchlistsAfterSync).toContain(watchlistId);
      expect(watchlistsAfterSync).toContain(FAKE_WATCHLIST_ID);

      // Remove alice from source and re-sync — watchlistId should be gone, fake id should remain
      await utils.clearSourceIndex(sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const watchlistsAfterRemoval = await entityStore.getEntityWatchlists(userEuid('alice'));
      expect(watchlistsAfterRemoval).not.toContain(watchlistId);
      expect(watchlistsAfterRemoval).toContain(FAKE_WATCHLIST_ID);
    });
  });
};
