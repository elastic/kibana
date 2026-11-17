/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import {
  DETECTION_STATE_SO_TYPE,
  detectionStateSavedObjectType,
} from '../../../saved_objects/detection_state_saved_object';
import { StateConflictError } from '../../errors/state_conflict_error';
import { acquireRunLease } from '../run_lease';
import { SavedObjectStateStore } from '../saved_object_state_store';

// Runs against a Kibana root with its saved objects index, so it proves the conflict and namespace
// rules of the real repository.
describe('SavedObjectStateStore', () => {
  jest.setTimeout(10 * 60 * 1000);

  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let store: SavedObjectStateStore;
  let spaceCounter = 0;

  const nextSpaceId = () => `space-${spaceCounter++}`;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout: number) => jest.setTimeout(timeout),
      settings: { es: { license: 'basic' } },
    });
    esServer = await startES();
    root = createRootWithCorePlugins({});
    await root.preboot();
    const setup = await root.setup();
    setup.savedObjects.registerType(detectionStateSavedObjectType);
    const start = await root.start();
    store = new SavedObjectStateStore(
      start.savedObjects.createInternalRepository([DETECTION_STATE_SO_TYPE])
    );
  });

  afterAll(async () => {
    await root?.shutdown();
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

    // The first holder's release must not end the lease that replaced its own.
    if (first.acquired) {
      await first.held.release();
    }
    const afterStaleRelease = await acquireRunLease({ state: store, spaceId, now: start + 2_500 });
    expect(afterStaleRelease.acquired).toBe(false);
  });

  it('frees the lease when its holder releases it', async () => {
    const spaceId = nextSpaceId();

    const first = await acquireRunLease({ state: store, spaceId });
    if (first.acquired) {
      await first.held.release();
    }

    expect((await acquireRunLease({ state: store, spaceId })).acquired).toBe(true);
  });

  it('keeps the state of one space apart from another', async () => {
    const [spaceA, spaceB] = [nextSpaceId(), nextSpaceId()];
    await store.put({
      spaceId: spaceA,
      kind: 'generator_state',
      key: 's',
      value: { processed_until: 1 },
    });

    expect(await store.get({ spaceId: spaceB, kind: 'generator_state', key: 's' })).toBeUndefined();
    // The same document can be created in the other space, and in the default one.
    await store.put({
      spaceId: spaceB,
      kind: 'generator_state',
      key: 's',
      value: { processed_until: 2 },
    });
    await store.put({
      spaceId: 'default',
      kind: 'generator_state',
      key: 's',
      value: { processed_until: 3 },
    });
    expect(
      (await store.get({ spaceId: spaceA, kind: 'generator_state', key: 's' }))?.value
        .processed_until
    ).toBe(1);
  });

  it('rejects a write made with a stale version and one that creates an existing document', async () => {
    const spaceId = nextSpaceId();
    const created = await store.put({
      spaceId,
      kind: 'generator_state',
      key: 'strategy',
      value: { processed_until: 1 },
    });
    await store.put({
      spaceId,
      kind: 'generator_state',
      key: 'strategy',
      value: { processed_until: 2 },
      version: created,
    });

    await expect(
      store.put({
        spaceId,
        kind: 'generator_state',
        key: 'strategy',
        value: { processed_until: 3 },
        version: created,
      })
    ).rejects.toBeInstanceOf(StateConflictError);
    await expect(
      store.put({
        spaceId,
        kind: 'generator_state',
        key: 'strategy',
        value: { processed_until: 4 },
      })
    ).rejects.toBeInstanceOf(StateConflictError);
    expect(
      (await store.get({ spaceId, kind: 'generator_state', key: 'strategy' }))?.value
        .processed_until
    ).toBe(2);
  });
});
