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
import {
  IntegrationSourceUtils,
  oktaEuid,
  PRIVILEGED_USER_WATCHLIST_ID,
} from './utils/integration_source_utils';

export default ({ getService }: FtrProviderContext) => {
  describe('@ess @serverless @skipInServerlessMKI Integration Source Sync', () => {
    const utils = WatchlistSyncUtils(getService);
    const entityStore = EntityStoreUtils(getService);
    const integrationSource = IntegrationSourceUtils(getService);

    before(async () => {
      await entityStore.install(['user']);
    });

    after(async () => {
      await entityStore.uninstall();
      await utils.cleanWatchlistState();
    });

    beforeEach(async () => {
      await utils.cleanWatchlistState();
      await integrationSource.installPrebuiltWatchlists();
      await integrationSource.createOktaIndices();
    });

    afterEach(async () => {
      // The prebuilt watchlist uses a fixed id, so entities synced into
      // `.entity_analytics.watchlists.*` by one test would otherwise leak into the next.
      await utils.deleteWatchlistDocs(PRIVILEGED_USER_WATCHLIST_ID);
      await integrationSource.deleteOktaIndices();
      await entityStore.clearAllEntityStoreData();
      await utils.cleanWatchlistState();
    });

    it('adds a newly-privileged entity to the privileged users watchlist', async () => {
      await integrationSource.addOktaUsers([
        { email: 'carol@corp', roles: ['Super Administrator'] },
      ]);
      await entityStore.forceExtractEntities('user');

      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);

      const entities = await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID);
      expect(utils.findEntity(entities, oktaEuid('carol@corp'))).toBeDefined();
    });

    it('removes an entity from the privileged users watchlist once it loses privileges, confirmed by a full sync — and continues to work correctly across multiple full syncs over time', async () => {
      // --- Round 1: carol stays admin, dave gets demoted ---
      await integrationSource.addOktaUsers([
        { email: 'carol@corp', roles: ['Super Administrator'] },
        { email: 'dave@corp', roles: ['Super Administrator'] },
      ]);
      await entityStore.forceExtractEntities('user');
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);
      expect(await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID)).toHaveLength(2);

      await integrationSource.addOktaUsers([
        { email: 'carol@corp', roles: ['Super Administrator'] },
        { email: 'dave@corp', roles: ['Standard User'] },
      ]);
      await integrationSource.markFullSyncCompleted();
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);

      const afterRound1 = await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID);
      expect(afterRound1).toHaveLength(1);
      expect(utils.findEntity(afterRound1, oktaEuid('carol@corp'))).toBeDefined();
      expect(utils.findEntity(afterRound1, oktaEuid('dave@corp'))).toBeUndefined();

      // --- Round 2: on the same source, a second, later full sync — erin stays admin,
      // frank gets demoted. This specifically exercises resolveFullSyncState correctly
      // detecting a *new* completed marker after one was already processed in round 1. ---
      await integrationSource.addOktaUsers([
        { email: 'erin@corp', roles: ['Super Administrator'] },
        { email: 'frank@corp', roles: ['Super Administrator'] },
      ]);
      await entityStore.forceExtractEntities('user');
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);
      expect(await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID)).toHaveLength(3);

      await integrationSource.addOktaUsers([
        { email: 'erin@corp', roles: ['Super Administrator'] },
        { email: 'frank@corp', roles: ['Standard User'] },
      ]);
      await integrationSource.markFullSyncCompleted();
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);

      const afterRound2 = await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID);
      expect(afterRound2).toHaveLength(2);
      expect(utils.findEntity(afterRound2, oktaEuid('carol@corp'))).toBeDefined();
      expect(utils.findEntity(afterRound2, oktaEuid('erin@corp'))).toBeDefined();
      expect(utils.findEntity(afterRound2, oktaEuid('dave@corp'))).toBeUndefined();
      expect(utils.findEntity(afterRound2, oktaEuid('frank@corp'))).toBeUndefined();
    });

    it('does not remove an entity from the watchlist until we can confirm the full picture via a completed full sync', async () => {
      await integrationSource.addOktaUsers([
        { email: 'carol@corp', roles: ['Super Administrator'] },
        { email: 'dave@corp', roles: ['Super Administrator'] },
      ]);
      await entityStore.forceExtractEntities('user');
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);
      expect(await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID)).toHaveLength(2);

      // Demote dave via a purely incremental update — deliberately no markFullSyncCompleted.
      await integrationSource.addOktaUsers([
        { email: 'carol@corp', roles: ['Super Administrator'] },
        { email: 'dave@corp', roles: ['Standard User'] },
      ]);
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);

      const afterIncrementalDemotion = await utils.queryWatchlistIndex(
        PRIVILEGED_USER_WATCHLIST_ID
      );
      expect(afterIncrementalDemotion).toHaveLength(2);
      expect(utils.findEntity(afterIncrementalDemotion, oktaEuid('carol@corp'))).toBeDefined();
      expect(utils.findEntity(afterIncrementalDemotion, oktaEuid('dave@corp'))).toBeDefined();

      // Only once a full sync completes is dave actually removed.
      await integrationSource.markFullSyncCompleted();
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);

      const afterFullSync = await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID);
      expect(afterFullSync).toHaveLength(1);
      expect(utils.findEntity(afterFullSync, oktaEuid('dave@corp'))).toBeUndefined();
    });

    it('does not add an entity that is not currently privileged, even if it held the privilege briefly in the past', async () => {
      const earlier = new Date(Date.now() - 60_000).toISOString();
      const later = new Date().toISOString();

      // grace was briefly a Super Administrator, but her true latest document demotes her —
      // all before this source has ever been synced.
      await integrationSource.addOktaUsers(
        [{ email: 'grace@corp', roles: ['Super Administrator'] }],
        earlier
      );
      await integrationSource.addOktaUsers(
        [{ email: 'grace@corp', roles: ['Standard User'] }],
        later
      );
      await entityStore.forceExtractEntities('user');

      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);

      const entities = await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID);
      expect(utils.findEntity(entities, oktaEuid('grace@corp'))).toBeUndefined();
    });

    it('does not add an entity that has never had the privilege, not even after a full sync', async () => {
      await integrationSource.addOktaUsers([{ email: 'henry@corp', roles: ['Standard User'] }]);
      await entityStore.forceExtractEntities('user');
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);
      expect(
        utils.findEntity(
          await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID),
          oktaEuid('henry@corp')
        )
      ).toBeUndefined();

      await integrationSource.markFullSyncCompleted();
      await utils.syncWatchlist(PRIVILEGED_USER_WATCHLIST_ID);
      expect(
        utils.findEntity(
          await utils.queryWatchlistIndex(PRIVILEGED_USER_WATCHLIST_ID),
          oktaEuid('henry@corp')
        )
      ).toBeUndefined();
    });
  });
};
