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

const WATCHLISTS_BASE_URL = '/api/entity_analytics/watchlists';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const entityAnalyticsApi = getService('entityAnalyticsApi');

  describe('@ess @serverless @skipInServerlessMKI Watchlist CSV Upload', () => {
    const sourceIndexName = 'watchlist-csv-upload-test-users';
    const utils = WatchlistSyncUtils(getService, [sourceIndexName]);
    const entityStore = EntityStoreUtils(getService);

    const uploadCsv = (watchlistId: string, csvContent: string) =>
      supertest
        .post(`${WATCHLISTS_BASE_URL}/${watchlistId}/csv_upload`)
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'Kibana')
        .set('elastic-api-version', '1')
        .attach('file', Buffer.from(csvContent), {
          filename: 'watchlist.csv',
          contentType: 'text/csv',
        });

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

    it('should add an entity to the watchlist with a manual source label after CSV upload', async () => {
      const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
        body: { name: 'csv-source-label', description: '', riskModifier: 1 },
      });
      const watchlistId = watchlist.id;

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });

      const csvContent = `type,user.name\nuser,alice\n`;
      const response = await uploadCsv(watchlistId, csvContent);
      expect(response.status).toBe(200);
      expect(response.body.successful).toBeGreaterThanOrEqual(1);

      const docs = await utils.queryWatchlistIndex(watchlistId);
      expect(docs).toHaveLength(1);

      const doc = utils.findEntity(docs, userEuid('alice'));
      const sources = (doc?.labels as { sources?: string[] } | undefined)?.sources ?? [];
      expect(sources).toContain('manual');
    });

    it('should merge source labels when entity is added via CSV and later synced from an index source', async () => {
      await utils.createSourceIndex(sourceIndexName);
      const { watchlistId } = await utils.createWatchlistAndEntitySource(
        'csv-index-merge',
        sourceIndexName
      );

      await entityStore.createEntity('user', {
        user: { name: 'alice' },
        entity: { id: userEuid('alice'), type: 'user' },
      });

      const csvContent = `type,user.name\nuser,alice\n`;
      const csvResponse = await uploadCsv(watchlistId, csvContent);
      expect(csvResponse.status).toBe(200);
      expect(csvResponse.body.successful).toBeGreaterThanOrEqual(1);

      await utils.addUsersToSourceIndex(['alice'], sourceIndexName);
      await utils.syncWatchlist(watchlistId);

      const docs = await utils.queryWatchlistIndex(watchlistId);
      expect(docs).toHaveLength(1);

      const doc = utils.findEntity(docs, userEuid('alice'));
      const sources = (doc?.labels as { sources?: string[] } | undefined)?.sources ?? [];
      expect(sources).toContain('manual');
      expect(sources).toContain('index');
    });
  });
};
