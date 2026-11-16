/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { ElasticsearchStateStore } from '../elasticsearch_state_store';
import { acquireRunLease } from '../run_lease';
import { StateConflictError } from '../../errors/state_conflict_error';
import { StateIndex } from '../state_index';

// Runs as the test cluster's superuser: the kibana_system grant on the state index is a separate
// Elasticsearch change, so these tests do not cover it.
describe('ElasticsearchStateStore', () => {
  let esServer: TestElasticsearchUtils;
  let store: ElasticsearchStateStore;
  let spaceCounter = 0;

  const nextSpaceId = () => `space-${spaceCounter++}`;

  jest.setTimeout(10 * 60 * 1000);

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
      settings: { es: { license: 'basic' } },
    });
    esServer = await startES();
    const esClient: ElasticsearchClient = esServer.es.getClient();
    store = new ElasticsearchStateStore(
      esClient,
      new StateIndex(esClient, loggingSystemMock.createLogger())
    );
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  it('gives the lease to one of several concurrent acquirers', async () => {
    const spaceId = nextSpaceId();

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () => acquireRunLease({ state: store, spaceId }))
    );

    expect(attempts.filter(({ acquired }) => acquired)).toHaveLength(1);
  });

  it('takes over an expired lease and leaves a live holder alone', async () => {
    const spaceId = nextSpaceId();
    const start = Date.now();

    const first = await acquireRunLease({ state: store, spaceId, ttlMs: 1_000, now: start });
    const whileLive = await acquireRunLease({ state: store, spaceId, now: start + 500 });
    const afterExpiry = await acquireRunLease({ state: store, spaceId, now: start + 2_000 });

    expect(first.acquired).toBe(true);
    expect(whileLive.acquired).toBe(false);
    expect(afterExpiry.acquired).toBe(true);

    // The first holder's release must not delete the lease that replaced its own.
    if (first.acquired) {
      await first.held.release();
    }
    const afterStaleRelease = await acquireRunLease({ state: store, spaceId, now: start + 2_500 });
    expect(afterStaleRelease.acquired).toBe(false);
  });

  it('rejects a write made with a stale version', async () => {
    const spaceId = nextSpaceId();
    const created = await store.put({
      spaceId,
      kind: 'watermark',
      key: 'strategy',
      value: { processed_until: 1 },
    });
    await store.put({
      spaceId,
      kind: 'watermark',
      key: 'strategy',
      value: { processed_until: 2 },
      version: created,
    });

    await expect(
      store.put({
        spaceId,
        kind: 'watermark',
        key: 'strategy',
        value: { processed_until: 3 },
        version: created,
      })
    ).rejects.toBeInstanceOf(StateConflictError);
    expect(
      (await store.get({ spaceId, kind: 'watermark', key: 'strategy' }))?.value.processed_until
    ).toBe(2);
  });
});
