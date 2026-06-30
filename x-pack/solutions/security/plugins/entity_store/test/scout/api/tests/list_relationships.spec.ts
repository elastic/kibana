/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { PUBLIC_HEADERS, ENTITY_STORE_ROUTES, ENTITY_STORE_TAGS } from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common';
import { clearEntityStoreIndices } from '../fixtures/helpers';
import { getMetadataEntitiesDataStreamName } from '../../../../server/domain/asset_manager/metadata_data_stream';

const METADATA_DATA_STREAM = getMetadataEntitiesDataStreamName('default');

const LIST_RELATIONSHIPS_ROUTE = (entityId: string) =>
  `api/security/entity_store/entities/${encodeURIComponent(entityId)}/relationships`;

const ALICE = 'user:alice@local';

const makeMetadataDoc = (overrides: Record<string, unknown> = {}) => ({
  '@timestamp': '2026-05-15T10:30:00.000Z',
  event: { kind: 'event', action: 'relationship_observed' },
  entity: { id: ALICE, source: 'elastic_defend' },
  Maintainer: {
    kind: 'accesses_frequently_and_infrequently',
    scan_id: 'scan-1',
    lookback_window: '24h',
  },
  ...overrides,
});

apiTest.describe('GET /entities/{entityId}/relationships', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };

    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest.beforeEach(async ({ apiClient, esClient }) => {
    // Install the entity store so the metadata datastream + ingest pipeline
    // come up (verified by Phase 1 spec). Phase 4 reads through the alias.
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(201);

    // Seed three records for alice: two against host:laptopA at
    // different timestamps, one communicates_with at a third timestamp.
    const docs = [
      makeMetadataDoc({
        '@timestamp': '2026-04-20T08:00:00.000Z',
        'entity.relationships': { accesses_frequently: { target: 'host:laptopA' } },
      }),
      makeMetadataDoc({
        '@timestamp': '2026-05-15T10:30:00.000Z',
        'entity.relationships': { accesses_frequently: { target: 'host:laptopA' } },
      }),
      makeMetadataDoc({
        '@timestamp': '2026-05-10T09:00:00.000Z',
        'entity.relationships': { communicates_with: { target: 'host:server-1' } },
      }),
    ];
    for (const doc of docs) {
      await esClient.index({
        index: METADATA_DATA_STREAM,
        op_type: 'create',
        refresh: 'wait_for',
        body: doc,
      });
    }
  });

  apiTest.afterEach(async ({ apiClient, esClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    await esClient.indices.deleteDataStream({ name: METADATA_DATA_STREAM }, { ignore: [404] });
    await clearEntityStoreIndices(esClient);
  });

  apiTest(
    'returns the oldest record when sorted asc with per_page=1 (first-seen)',
    async ({ apiClient }) => {
      const resp = await apiClient.get(
        `${LIST_RELATIONSHIPS_ROUTE(ALICE)}?target=host:laptopA&sort_order=asc&per_page=1`,
        { headers: defaultHeaders, responseType: 'json' }
      );
      expect(resp.statusCode).toBe(200);
      const body = resp.body as { records: Array<{ '@timestamp': string }> };
      expect(body.records).toHaveLength(1);
      expect(body.records[0]['@timestamp']).toBe('2026-04-20T08:00:00.000Z');
    }
  );

  apiTest(
    'returns the newest record when sorted desc with per_page=1 (last-seen)',
    async ({ apiClient }) => {
      const resp = await apiClient.get(
        `${LIST_RELATIONSHIPS_ROUTE(ALICE)}?target=host:laptopA&sort_order=desc&per_page=1`,
        { headers: defaultHeaders, responseType: 'json' }
      );
      expect(resp.statusCode).toBe(200);
      const body = resp.body as { records: Array<{ '@timestamp': string }> };
      expect(body.records).toHaveLength(1);
      expect(body.records[0]['@timestamp']).toBe('2026-05-15T10:30:00.000Z');
    }
  );

  apiTest(
    'filters by kind=communicates_with and a from date (last 30 days style)',
    async ({ apiClient }) => {
      const resp = await apiClient.get(
        `${LIST_RELATIONSHIPS_ROUTE(ALICE)}?kind=communicates_with&from=${encodeURIComponent(
          '2026-04-27T00:00:00.000Z'
        )}`,
        { headers: defaultHeaders, responseType: 'json' }
      );
      expect(resp.statusCode).toBe(200);
      const body = resp.body as { records: Array<{ '@timestamp': string }> };
      expect(body.records).toHaveLength(1);
      expect(body.records[0]['@timestamp']).toBe('2026-05-10T09:00:00.000Z');
    }
  );

  apiTest(
    'returns an empty records array (not an error) for an entity with no records',
    async ({ apiClient }) => {
      const resp = await apiClient.get(LIST_RELATIONSHIPS_ROUTE('user:nobody@local'), {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(resp.statusCode).toBe(200);
      const body = resp.body as { records: unknown[] };
      expect(body.records).toStrictEqual([]);
    }
  );
});
