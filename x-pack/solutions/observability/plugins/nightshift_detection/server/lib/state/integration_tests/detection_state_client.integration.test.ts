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
import type { ISavedObjectsRepository, SavedObjectsBaseOptions } from '@kbn/core/server';
import { StateConflictError } from '../../errors/state_conflict_error';
import {
  DETECTION_STATE_SO_TYPE,
  detectionStateSavedObjectType,
} from '../detection_state_saved_object';
import { DetectionStateClient } from '..';

/** A repository whose `get` answers only once `parties` reads have been made. */
function withReadBarrier(repository: ISavedObjectsRepository, parties: number) {
  let reads = 0;
  let allRead: () => void;
  const everyoneRead = new Promise<void>((resolve) => {
    allRead = resolve;
  });

  return Object.assign(Object.create(repository), {
    get: async (type: string, id: string, options?: SavedObjectsBaseOptions) => {
      const outcome = await repository.get(type, id, options).then(
        (value) => ({ value }),
        (error) => ({ error })
      );
      if (++reads === parties) {
        allRead();
      }
      await everyoneRead;
      if ('error' in outcome) {
        throw outcome.error;
      }
      return outcome.value;
    },
  }) as ISavedObjectsRepository;
}

// Runs against a Kibana root with its saved objects index, so it proves the conflict and namespace
// rules of the real repository that the in-memory one only imitates.
describe('DetectionStateClient on saved objects', () => {
  jest.setTimeout(10 * 60 * 1000);

  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let client: DetectionStateClient;
  let repository: ISavedObjectsRepository;
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
    repository = start.savedObjects.createInternalRepository([DETECTION_STATE_SO_TYPE]);
    client = new DetectionStateClient(repository);
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('keeps the state of one space apart from another, the default space included', async () => {
    const [spaceA, spaceB] = [nextSpaceId(), nextSpaceId()];
    const advance = (spaceId: string, processedUntil: number) =>
      client.advanceGeneratorState({ spaceId, strategyId: 'strategy', processedUntil });
    const read = async (spaceId: string) =>
      (await client.readGeneratorStates({ spaceId, strategyIds: ['strategy'] })).get('strategy');

    await advance(spaceA, 1);
    expect(await read(spaceB)).toBeUndefined();
    await advance(spaceB, 2);
    await advance('default', 3);

    expect([await read(spaceA), await read(spaceB), await read('default')]).toEqual([1, 2, 3]);
  });

  it('throws a conflict to the writer that lost a race for a generator state', async () => {
    const spaceId = nextSpaceId();
    // Both writers must read before either writes, or the second one would see the first one's
    // state and move it forward instead of racing it.
    const racing = new DetectionStateClient(withReadBarrier(repository, 2));

    const outcomes = await Promise.allSettled(
      [100, 200].map((processedUntil) =>
        racing.advanceGeneratorState({ spaceId, strategyId: 'strategy', processedUntil })
      )
    );

    const rejected = outcomes.filter(({ status }) => status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(StateConflictError);
  });
});
