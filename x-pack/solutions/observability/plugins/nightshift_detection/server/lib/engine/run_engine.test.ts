/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { AvailabilityUnavailableReason } from '../availability/availability_service';
import { DetectionStateClient } from '../state/detection_state_client';
import { StrategyCatalog } from '../strategies/strategy_catalog';
import type { DetectionStrategy } from '../strategies/detection_strategy';
import { InMemorySignalStore } from '../../test_utils/in_memory_signal_store';
import { InMemorySavedObjectsRepository } from '../../test_utils/in_memory_saved_objects_repository';
import { createTestStrategy, TEST_STRATEGY_ID } from '../../test_utils/test_strategy';
import type { ManagedRuleReader } from '../rules/managed_rule_reader';
import { EngineRunner, RUN_BUDGET_MS } from './run_engine';
import type { SpaceRunLock } from './space_run_lock';

const SPACE_ID = 'default';
const NOW = Date.UTC(2026, 10, 13, 12, 0);
const MINUTE_MS = 60_000;

function createStateClient() {
  return new DetectionStateClient(new InMemorySavedObjectsRepository().asRepository());
}

/** A run lock that lets one run per space in, like the real one, without Elasticsearch. */
function createSpaceRunLock() {
  const held = new Set<string>();
  const lock: Pick<SpaceRunLock, 'run'> = {
    run: async ({ spaceId, callback }) => {
      if (held.has(spaceId)) {
        return { ran: false };
      }
      held.add(spaceId);
      try {
        return { ran: true, result: await callback() };
      } finally {
        held.delete(spaceId);
      }
    },
  };

  return { lock, held };
}

function createRunner({
  strategies = [createTestStrategy()],
  unavailableReason,
  state = createStateClient(),
  signals = new InMemorySignalStore(),
  lock = createSpaceRunLock().lock,
}: {
  strategies?: DetectionStrategy[];
  unavailableReason?: AvailabilityUnavailableReason;
  state?: DetectionStateClient;
  signals?: InMemorySignalStore;
  lock?: Pick<SpaceRunLock, 'run'>;
} = {}) {
  const runner = new EngineRunner(
    { spaceId: SPACE_ID, runId: 'run-1', scheduledMinute: NOW },
    { getUnavailableReason: async () => unavailableReason },
    new StrategyCatalog(strategies),
    state,
    lock,
    signals,
    { list: async () => [] },
    elasticsearchServiceMock.createElasticsearchClient(),
    { listQueries: async () => [], listFeatures: async () => [] },
    { listManaged: async () => [], readRows: async () => [] } as unknown as ManagedRuleReader,
    loggingSystemMock.createLogger(),
    undefined
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
  afterEach(() => {
    jest.useRealTimers();
  });

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

  it('keeps the generator state when the run ends while its signals are being stored', async () => {
    const signals = new InMemorySignalStore();
    const write = signals.write.bind(signals);
    const controller = new AbortController();
    // The run ends mid-write, as when the budget runs out and another node can take the space.
    jest.spyOn(signals, 'write').mockImplementationOnce(async (batch) => {
      const outcome = await write(batch);
      controller.abort('the run ended');
      return outcome;
    });
    const { runner, state } = createRunner({ signals });

    const result = await runner.run({ now: NOW, abortSignal: controller.signal });

    expect(result).toMatchObject({
      strategies: [{ id: TEST_STRATEGY_ID, error: expect.stringContaining('run ended') }],
    });
    expect(
      await state.readGeneratorStates({ spaceId: SPACE_ID, strategyIds: [TEST_STRATEGY_ID] })
    ).toEqual(new Map());
  });

  it('reports busy and writes nothing while another run holds the space', async () => {
    const { lock, held } = createSpaceRunLock();
    held.add(SPACE_ID);
    const { runner, signals } = createRunner({ lock });

    const result = await runner.run({ now: NOW + MINUTE_MS });

    expect(result).toMatchObject({ status: 'busy', strategies: [] });
    expect(signals.written).toHaveLength(0);
  });

  it('releases the space when the run is aborted', async () => {
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
    const { lock, held } = createSpaceRunLock();
    const { runner } = createRunner({ strategies: [waitsForAbort], lock });
    const controller = new AbortController();

    const running = runner.run({ now: NOW, abortSignal: controller.signal });
    // Abort while the generator is running, as when the request goes away mid-tick.
    await started;
    controller.abort('the request went away');
    const result = await running;

    expect(result).toMatchObject({
      strategies: [{ id: 'waits_for_abort', error: 'aborted' }],
    });
    expect(held.has(SPACE_ID)).toBe(false);
  });

  it('stores nothing from a run aborted before it starts, even from a generator that returns at once', async () => {
    const { runner, state, signals } = createRunner();
    const controller = new AbortController();
    controller.abort('the request went away');

    const result = await runner.run({ now: NOW, abortSignal: controller.signal });

    expect(result).toMatchObject({
      strategies: [{ id: TEST_STRATEGY_ID, signals: 0, error: 'the request went away' }],
    });
    expect(signals.written).toHaveLength(0);
    expect(
      await state.readGeneratorStates({ spaceId: SPACE_ID, strategyIds: [TEST_STRATEGY_ID] })
    ).toEqual(new Map());
  });

  it('stops a generator that ignores its signal once the run budget is spent', async () => {
    jest.useFakeTimers();
    let generatorStarted: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      generatorStarted = resolve;
    });
    const ignoresAbort: DetectionStrategy = {
      descriptor: { ...createTestStrategy().descriptor, id: 'ignores_abort' },
      generator: {
        generate: () => {
          generatorStarted();
          return new Promise(() => {});
        },
      },
    };
    const { lock, held } = createSpaceRunLock();
    const { runner, state } = createRunner({ strategies: [ignoresAbort], lock });

    const running = runner.run({ now: NOW });
    await started;
    await jest.advanceTimersByTimeAsync(RUN_BUDGET_MS);
    const result = await running;

    expect(result).toMatchObject({
      status: 'completed',
      strategies: [{ id: 'ignores_abort', error: 'the run budget is spent' }],
    });
    expect(
      await state.readGeneratorStates({ spaceId: SPACE_ID, strategyIds: ['ignores_abort'] })
    ).toEqual(new Map());
    expect(held.has(SPACE_ID)).toBe(false);
  });

  it('takes no run lock while the engine is unavailable', async () => {
    const { lock } = createSpaceRunLock();
    const run = jest.spyOn(lock, 'run');
    const { runner } = createRunner({ unavailableReason: 'license', lock });

    const result = await runner.run({ now: NOW });

    expect(result).toMatchObject({ status: 'unavailable', reason: 'license', strategies: [] });
    expect(run).not.toHaveBeenCalled();
  });
});
