/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { DetectionStateClient } from '../state/detection_state_client';
import { StrategyCatalog } from '../strategies/strategy_catalog';
import type { DetectionStrategy } from '../strategies/detection_strategy';
import { InMemorySignalStore } from '../../test_utils/in_memory_signal_store';
import { InMemorySavedObjectsRepository } from '../../test_utils/in_memory_saved_objects_repository';
import { createTestStrategy, TEST_STRATEGY_ID } from '../../test_utils/test_strategy';
import { EngineRunner } from './run_engine';

const SPACE_ID = 'default';
const NOW = Date.UTC(2026, 10, 13, 12, 0);
const MINUTE_MS = 60_000;

function createStateClient() {
  return new DetectionStateClient(new InMemorySavedObjectsRepository().asRepository());
}

function createRunner({
  strategies = [createTestStrategy()],
  isAvailable = true,
  state = createStateClient(),
  signals = new InMemorySignalStore(),
}: {
  strategies?: DetectionStrategy[];
  isAvailable?: boolean;
  state?: DetectionStateClient;
  signals?: InMemorySignalStore;
} = {}) {
  const runner = new EngineRunner(
    { spaceId: SPACE_ID, runId: 'run-1', scheduledMinute: NOW },
    { isAvailable: async () => isAvailable },
    new StrategyCatalog(strategies),
    state,
    signals,
    { list: async () => [] },
    elasticsearchServiceMock.createElasticsearchClient(),
    loggingSystemMock.createLogger()
  );

  return { runner, state, signals };
}

function createFailingStrategy(): DetectionStrategy {
  const { descriptor } = createTestStrategy();

  return {
    descriptor: { ...descriptor, id: 'failing_strategy' },
    generator: {
      generate: async () => {
        throw new Error('the query failed');
      },
    },
  };
}

describe('EngineRunner', () => {
  it('writes the signals of a due strategy and moves its generator state', async () => {
    const { runner, state, signals } = createRunner();

    const result = await runner.run({ now: NOW });

    expect(result).toMatchObject({
      status: 'completed',
      strategies: [{ id: TEST_STRATEGY_ID, signals: 2 }],
    });
    expect(signals.written).toHaveLength(2);
    expect(
      (await state.readGeneratorStates({ spaceId: SPACE_ID, strategyIds: [TEST_STRATEGY_ID] })).get(
        TEST_STRATEGY_ID
      )
    ).toBe(NOW);
  });

  it('keeps the generator state of a failing generator and still runs the others', async () => {
    const { runner, state, signals } = createRunner({
      strategies: [createFailingStrategy(), createTestStrategy()],
    });

    const result = await runner.run({ now: NOW });

    expect(result).toMatchObject({
      status: 'completed',
      strategies: [
        { id: 'failing_strategy', signals: 0, error: 'the query failed' },
        { id: TEST_STRATEGY_ID, signals: 2 },
      ],
    });
    expect(signals.written).toHaveLength(2);
    const processedUntil = await state.readGeneratorStates({
      spaceId: SPACE_ID,
      strategyIds: ['failing_strategy', TEST_STRATEGY_ID],
    });
    expect([...processedUntil.keys()]).toEqual([TEST_STRATEGY_ID]);
  });

  it('keeps the generator state when the store rejects a signal', async () => {
    const { runner, state } = createRunner({
      signals: new InMemorySignalStore(['test-series-breached']),
    });

    const result = await runner.run({ now: NOW });

    expect(result).toMatchObject({
      strategies: [{ id: TEST_STRATEGY_ID, signals: 1, error: expect.any(String) }],
    });
    expect(
      await state.readGeneratorStates({ spaceId: SPACE_ID, strategyIds: [TEST_STRATEGY_ID] })
    ).toEqual(new Map());
  });

  it('reports busy and writes nothing while another run holds the lease', async () => {
    const state = createStateClient();
    const held = await state.acquireLease({ spaceId: SPACE_ID, now: NOW });
    const { runner, signals } = createRunner({ state });

    const result = await runner.run({ now: NOW + MINUTE_MS });

    expect(result).toMatchObject({
      status: 'busy',
      held_by: held.acquired ? held.held.owner : undefined,
    });
    expect(signals.written).toHaveLength(0);
  });

  it('releases the lease when the run is aborted', async () => {
    let generatorStarted: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      generatorStarted = resolve;
    });
    const waitsForAbort: DetectionStrategy = {
      descriptor: { ...createTestStrategy().descriptor, id: 'waits_for_abort' },
      generator: {
        generate: ({ abortSignal }) =>
          new Promise((_resolve, reject) => {
            abortSignal.addEventListener('abort', () => reject(new Error('aborted')));
            generatorStarted();
          }),
      },
    };
    const state = createStateClient();
    const { runner } = createRunner({ strategies: [waitsForAbort], state });
    const controller = new AbortController();

    const running = runner.run({ now: NOW, abortSignal: controller.signal });
    // Abort while the generator is running, as when the request goes away mid-tick.
    await started;
    controller.abort('the request went away');
    const result = await running;

    expect(result).toMatchObject({
      strategies: [{ id: 'waits_for_abort', error: 'aborted' }],
    });
    // Released: the next run takes the lease at once.
    expect((await state.acquireLease({ spaceId: SPACE_ID, now: NOW })).acquired).toBe(true);
  });

  it('takes no lease while the engine is unavailable', async () => {
    const { runner, state } = createRunner({ isAvailable: false });
    const acquireLease = jest.spyOn(state, 'acquireLease');

    const result = await runner.run({ now: NOW });

    expect(result).toMatchObject({ status: 'unavailable', strategies: [] });
    expect(acquireLease).not.toHaveBeenCalled();
  });
});
