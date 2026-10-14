/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { runBackfillTask } from '.';
import {
  countPendingAlerts,
  pollBackfill,
  resolveTargetIndices,
  startBackfill,
} from './backfill_client';
import type { EntityStoreStartContract } from '@kbn/entity-store/server';

import { defaultState, type LatestTaskStateSchema } from './state';
import {
  MAX_CONFLICT_REISSUES,
  MAX_DOCS_PER_REQUEST,
  MAX_CONSECUTIVE_SPACE_FAILURES,
  MIN_RUN_INTERVAL_MS,
  RUN_INTERVAL_MS,
} from './constants';

jest.mock('./backfill_client');

const startBackfillMock = startBackfill as jest.MockedFunction<typeof startBackfill>;
const pollBackfillMock = pollBackfill as jest.MockedFunction<typeof pollBackfill>;
const resolveTargetIndicesMock = resolveTargetIndices as jest.MockedFunction<
  typeof resolveTargetIndices
>;
const countPendingAlertsMock = countPendingAlerts as jest.MockedFunction<typeof countPendingAlerts>;

/** The delete-task result carries no state, so only narrow where a test reads one. */
const stateOf = (result: unknown): LatestTaskStateSchema =>
  (result as { state: LatestTaskStateSchema }).state;

interface SpaceFixture {
  spaceId: string;
  /** What the Entity Analytics toggle has done to the risk score maintainer here. */
  riskScoring?: 'started' | 'stopped' | 'never_started';
  range?: { start: string; end: string };
}

const reportEventMock = jest.fn();

const createCoreStart = (spaces: SpaceFixture[]) =>
  ({
    elasticsearch: { client: elasticsearchServiceMock.createClusterClient() },
    analytics: { reportEvent: reportEventMock },
    savedObjects: {
      createInternalRepository: () => ({
        find: jest.fn().mockResolvedValue({
          total: spaces.length,
          saved_objects: spaces.map(({ spaceId, range = { start: 'now-30d', end: 'now' } }) => ({
            namespaces: [spaceId],
            attributes: { range },
          })),
        }),
      }),
    },
  } as unknown as CoreStart);

const createEntityStore = (spaces: SpaceFixture[]) =>
  ({
    getMaintainerStatus: jest.fn(async (namespace: string) => [
      {
        id: 'risk-score',
        taskStatus: spaces.find(({ spaceId }) => spaceId === namespace)?.riskScoring ?? 'started',
        lastSuccessTimestamp: null,
      },
    ]),
  } as unknown as EntityStoreStartContract);

const runTask = (spaces: SpaceFixture[], state = defaultState) =>
  runBackfillTask({
    coreStart: createCoreStart(spaces),
    logger: loggerMock.create(),
    entityStore: createEntityStore(spaces),
    enabled: true,
    state,
    signal: new AbortController().signal,
  });

describe('runBackfillTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reportEventMock.mockClear();
    resolveTargetIndicesMock.mockResolvedValue({ usable: new Set(['index-1']), unusable: 0 });
    countPendingAlertsMock.mockResolvedValue(100);
    startBackfillMock.mockResolvedValue('node:123');
    pollBackfillMock.mockResolvedValue({
      completed: false,
      updated: 50,
      total: 10_000,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
  });

  it('starts an update-by-query for a space that has none running', async () => {
    const result = await runTask([{ spaceId: 'default' }]);

    expect(startBackfillMock).toHaveBeenCalledTimes(1);
    expect(stateOf(result).spaces.default).toMatchObject({ esTaskId: 'node:123', done: false });
  });

  it('finishes one space before starting the next', async () => {
    // Spaces are taken in order, so a space with a request in flight keeps its turn rather than
    // the task moving on and running two at once.
    const state = {
      spaces: {
        a: { esTaskId: 'node:123', done: false, failures: 0, conflictReissues: 0, stamped: 0 },
      },
      runs: 1,
    };

    await runTask([{ spaceId: 'a' }, { spaceId: 'b' }], state);

    expect(pollBackfillMock).toHaveBeenCalledWith(
      expect.objectContaining({ esTaskId: 'node:123' })
    );
    expect(startBackfillMock).not.toHaveBeenCalled();
  });

  it('starts the request even when the pending count fails', async () => {
    // The count only feeds a log line. Letting it fail the run would count a failure against a
    // space whose backfill was about to start, and three of those abandon the space.
    countPendingAlertsMock.mockRejectedValue(new Error('search_phase_execution_exception'));

    const result = await runTask([{ spaceId: 'default' }]);

    expect(startBackfillMock).toHaveBeenCalledTimes(1);
    expect(stateOf(result).spaces.default).toMatchObject({ esTaskId: 'node:123', failures: 0 });
  });

  it('retires a space that has nothing left to stamp without issuing a request', async () => {
    // The task is rescheduled on every Kibana restart, so this is the common case once a backfill
    // has run. Submitting a request that matches nothing would cost two runs per space.
    countPendingAlertsMock.mockResolvedValue(0);

    const result = await runTask([{ spaceId: 'default' }]);

    expect(startBackfillMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ shouldDeleteTask: true });
  });

  it('retires every idle space in one run rather than one per run', async () => {
    // A space that needed no work has not used the one-request-at-a-time budget, so the run
    // carries on. Otherwise a re-run after a finished backfill would crawl through the spaces at
    // one every polling interval.
    countPendingAlertsMock.mockResolvedValue(0);

    const result = await runTask([{ spaceId: 'a' }, { spaceId: 'b' }, { spaceId: 'c' }]);

    expect(countPendingAlertsMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ shouldDeleteTask: true });
  });

  it('stops at the first space that needs work', async () => {
    // Only one update-by-query runs at a time, so a space that started one ends the run.
    countPendingAlertsMock.mockResolvedValue(100);

    await runTask([{ spaceId: 'a' }, { spaceId: 'b' }]);

    expect(startBackfillMock).toHaveBeenCalledTimes(1);
  });

  it('polls a running request instead of starting another', async () => {
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], state);

    expect(pollBackfillMock).toHaveBeenCalledWith(
      expect.objectContaining({ esTaskId: 'node:123' })
    );
    expect(startBackfillMock).not.toHaveBeenCalled();
    expect(stateOf(result).spaces.default).toMatchObject({ esTaskId: 'node:123', stamped: 0 });
  });

  it('starts the next space in the same run as one finishing', async () => {
    // The one-at-a-time budget is free the moment a request completes, so the next space should
    // not have to wait for another run to pick it up.
    pollBackfillMock.mockResolvedValue({
      completed: true,
      updated: 4200,
      total: 4200,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        a: { esTaskId: 'node:123', done: false, failures: 0, conflictReissues: 0, stamped: 0 },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'a' }, { spaceId: 'b' }], state);

    expect(startBackfillMock).toHaveBeenCalledWith(
      expect.objectContaining({ alertsIndex: expect.stringContaining('b') })
    );
    expect(stateOf(result).spaces.a).toMatchObject({ done: true });
  });

  it('polls sooner when the request is about to finish', async () => {
    // Otherwise a request that takes seconds still waits a full interval to be noticed, which on a
    // deployment of many small spaces is almost the entire wall clock.
    pollBackfillMock.mockResolvedValue({
      completed: false,
      updated: 9_900,
      total: 10_000,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = (await runTask([{ spaceId: 'default' }], state)) as { runAt: Date };

    // 100 alerts left at 500/s, so the floor applies rather than the full interval.
    expect(result.runAt.getTime() - Date.now()).toBeLessThanOrEqual(MIN_RUN_INTERVAL_MS + 1_000);
  });

  it('waits the full interval when the request has hours left', async () => {
    // The estimate only ever shortens the wait. Letting it lengthen would mean a request that
    // dies early goes unnoticed for as long as it claimed to need.
    pollBackfillMock.mockResolvedValue({
      completed: false,
      updated: 0,
      total: 10_000_000,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = (await runTask([{ spaceId: 'default' }], state)) as { runAt: Date };

    expect(result.runAt.getTime() - Date.now()).toBeGreaterThan(RUN_INTERVAL_MS - 1_000);
  });

  it('removes the task once every space has finished', async () => {
    pollBackfillMock.mockResolvedValue({
      completed: true,
      updated: 4200,
      total: 10_000,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    await expect(runTask([{ spaceId: 'default' }], state)).resolves.toMatchObject({
      shouldDeleteTask: true,
    });
  });

  it('reissues the request when its Elasticsearch task has vanished', async () => {
    // The node running it restarted, or someone cancelled it. Alerts it never reached are still
    // unstamped, so the space must not be treated as finished.
    pollBackfillMock.mockResolvedValue({
      completed: false,
      updated: 0,
      total: 10_000,
      versionConflicts: 0,
      vanished: true,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], state);

    expect(stateOf(result).spaces.default).toMatchObject({ esTaskId: undefined, done: false });
  });

  it('completes a space that has no alert indices yet', async () => {
    // A risk engine can be enabled before any rule has run in that space.
    resolveTargetIndicesMock.mockResolvedValue({ usable: new Set<string>(), unusable: 0 });

    const result = await runTask([{ spaceId: 'default' }]);

    expect(startBackfillMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ shouldDeleteTask: true });
  });

  it('retries a space whose indices all refuse writes rather than completing it', async () => {
    // The usual cause is a disk flood-stage watermark, which clears on its own — and which a
    // heavy backfill can provoke itself.
    resolveTargetIndicesMock.mockResolvedValue({ usable: new Set<string>(), unusable: 2 });

    const result = await runTask([{ spaceId: 'default' }]);

    expect(stateOf(result).spaces.default).toMatchObject({ failures: 1, done: false });
  });

  it('gives up on a space after repeated failures instead of retrying forever', async () => {
    // Without a limit, a permanently broken space never reaches `done`, so the task keeps asking
    // Task Manager for another run indefinitely.
    startBackfillMock.mockRejectedValue(new Error('index gone'));
    const state = {
      spaces: {
        default: {
          done: false,
          failures: MAX_CONSECUTIVE_SPACE_FAILURES - 1,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 5,
    };

    await expect(runTask([{ spaceId: 'default' }], state)).resolves.toMatchObject({
      shouldDeleteTask: true,
    });
  });

  it('ignores a space where Entity Analytics was never set up', async () => {
    const result = await runTask([{ spaceId: 'off', riskScoring: 'never_started' }]);

    expect(startBackfillMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ shouldDeleteTask: true });
  });

  it('skips a space where risk scoring has been turned off', async () => {
    // Under V2 the Entity Analytics toggle starts and stops this maintainer, so its status — not
    // the risk engine's `enabled` flag — is what says whether scoring runs here.
    const result = await runTask([{ spaceId: 'default', riskScoring: 'stopped' }]);

    expect(startBackfillMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ shouldDeleteTask: true });
  });

  it('backfills a space whose risk engine configuration is not enabled', async () => {
    // `enabled` belongs to the V1 scoring task; the V2 maintainer never reads it, so a space can
    // be scoring normally with it false. Filtering on it would skip most deployments.
    await runTask([{ spaceId: 'default' }]);

    expect(startBackfillMock).toHaveBeenCalledTimes(1);
  });

  it('reissues the request when alerts were skipped because another writer held them', async () => {
    // `conflicts: proceed` steps over those alerts and the request still completes, so a space
    // that looks finished can have its newest alerts unstamped.
    pollBackfillMock.mockResolvedValue({
      completed: true,
      updated: 4200,
      total: 10_000,
      versionConflicts: 7,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], state);

    expect(stateOf(result).spaces.default).toMatchObject({
      esTaskId: undefined,
      done: false,
      conflictReissues: 1,
      // Counted now the request has finished, and carried across the reissue.
      stamped: 4200,
    });
  });

  it('stops reissuing once an alert has been held across every pass', async () => {
    // An alert written continuously would conflict forever; scoring still derives its EUID.
    pollBackfillMock.mockResolvedValue({
      completed: true,
      updated: 10,
      total: 10_000,
      versionConflicts: 7,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: MAX_CONFLICT_REISSUES,
          stamped: 100,
        },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], state);

    expect(result).toMatchObject({ shouldDeleteTask: true });
  });

  describe('the window it stamps over', () => {
    // `convertRangeToISO` resolves date math against the system clock, so the clamp has to be
    // measured from the same instant.
    const now = new Date('2026-10-08T00:00:00.000Z').getTime();

    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('resolves the configured range to absolute timestamps', async () => {
      // Stored absolute: left as date math the window would slide forward as the backfill ran,
      // and one full pass over it would never mean anything.
      const result = await runTask([
        { spaceId: 'default', range: { start: 'now-10d', end: 'now' } },
      ]);

      expect(stateOf(result).spaces.default.window).toEqual({
        start: '2026-09-28T00:00:00.000Z',
        end: '2026-10-08T00:00:00.000Z',
      });
    });

    it('clamps a range reaching further back than the maximum lookback', async () => {
      // `configuration.range` has no upper bound in the API, so a space could ask for a year.
      const result = await runTask([
        { spaceId: 'default', range: { start: 'now-1y', end: 'now' } },
      ]);

      expect(stateOf(result).spaces.default.window?.start).toBe('2026-09-08T00:00:00.000Z');
    });
  });

  it('keeps the slot for a space that is between requests', async () => {
    // A capped or conflicted request leaves the space mid-backfill. Letting an untouched space
    // overtake it would spread progress thinly, when finishing one space is what restores scoring
    // for it.
    const state = {
      spaces: {
        a: {
          window: { start: '2026-09-13T00:00:00.000Z', end: '2026-10-13T00:00:00.000Z' },
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 500_000,
        },
      },
      runs: 2,
    };

    await runTask([{ spaceId: 'b' }, { spaceId: 'a' }], state);

    expect(startBackfillMock).toHaveBeenCalledTimes(1);
    expect(startBackfillMock).toHaveBeenCalledWith(
      expect.objectContaining({ alertsIndex: expect.stringContaining('a') })
    );
  });

  it('reissues when a capped request finishes with alerts still pending', async () => {
    // Requests are capped at MAX_DOCS_PER_REQUEST, so completing does not mean finishing.
    pollBackfillMock.mockResolvedValue({
      completed: true,
      updated: 500_000,
      // Reached MAX_DOCS_PER_REQUEST, so the query was not exhausted.
      total: MAX_DOCS_PER_REQUEST,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], state);

    expect(stateOf(result).spaces.default).toMatchObject({
      esTaskId: undefined,
      done: false,
      stamped: 500_000,
    });
  });

  it('fails a space whose request stamped nothing with alerts still pending', async () => {
    // Reissuing forever would never terminate; the per-space failure budget abandons it instead.
    pollBackfillMock.mockResolvedValue({
      completed: true,
      // A full request that stamped nothing would repeat forever.
      updated: 0,
      total: MAX_DOCS_PER_REQUEST,
      versionConflicts: 0,
      vanished: false,
      failures: [],
    });
    const state = {
      spaces: {
        default: {
          esTaskId: 'node:123',
          done: false,
          failures: 0,
          conflictReissues: 0,
          stamped: 0,
        },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], state);

    expect(stateOf(result).spaces.default).toMatchObject({ failures: 1, done: false });
  });

  it('removes itself when the kill switch is set', async () => {
    // Deleting the task document is not enough: `ensureScheduled` recreates it on the next restart.
    const result = await runBackfillTask({
      coreStart: createCoreStart([{ spaceId: 'default' }]),
      logger: loggerMock.create(),
      entityStore: createEntityStore([{ spaceId: 'default' }]),
      enabled: false,
      state: defaultState,
      signal: new AbortController().signal,
    });

    expect(result).toMatchObject({ shouldDeleteTask: true });
    expect(startBackfillMock).not.toHaveBeenCalled();
  });

  describe('the completion event', () => {
    it('reports what the backfill achieved when every space finishes', async () => {
      pollBackfillMock.mockResolvedValue({
        completed: true,
        updated: 4_200,
        total: 4_200,
        versionConflicts: 0,
        vanished: false,
        failures: [],
      });
      const state = {
        spaces: {
          default: {
            esTaskId: 'node:123',
            done: false,
            failures: 0,
            conflictReissues: 0,
            stamped: 1_000,
          },
        },
        runs: 7,
        firstRunAt: new Date(Date.now() - 60_000).toISOString(),
      };

      await runTask([{ spaceId: 'default' }], state);

      expect(reportEventMock).toHaveBeenCalledWith(
        'alert_entity_id_backfill_completed',
        expect.objectContaining({
          runs: 8,
          spacesCompleted: 1,
          spacesAbandoned: 0,
          alertsStamped: 5_200,
          reachedRunLimit: false,
        })
      );
    });

    it('measures from the first run rather than the last', async () => {
      pollBackfillMock.mockResolvedValue({
        completed: true,
        updated: 1,
        total: 1,
        versionConflicts: 0,
        vanished: false,
        failures: [],
      });
      const state = {
        spaces: {
          default: {
            esTaskId: 'node:123',
            done: false,
            failures: 0,
            conflictReissues: 0,
            stamped: 0,
          },
        },
        runs: 1,
        firstRunAt: new Date(Date.now() - 2 * 60 * 60 * 1_000).toISOString(),
      };

      await runTask([{ spaceId: 'default' }], state);

      const [, payload] = reportEventMock.mock.calls[0];
      expect(payload.durationInSeconds).toBeGreaterThanOrEqual(7_190);
    });

    it('counts abandoned spaces separately from completed ones', async () => {
      startBackfillMock.mockRejectedValue(new Error('index gone'));
      const state = {
        spaces: {
          broken: {
            done: false,
            failures: MAX_CONSECUTIVE_SPACE_FAILURES - 1,
            conflictReissues: 0,
            stamped: 0,
          },
        },
        runs: 5,
      };

      await runTask([{ spaceId: 'broken' }], state);

      expect(reportEventMock).toHaveBeenCalledWith(
        'alert_entity_id_backfill_completed',
        expect.objectContaining({ spacesCompleted: 0, spacesAbandoned: 1 })
      );
    });
  });

  it('drops progress for spaces that no longer exist', async () => {
    // Otherwise the task stays alive waiting on a space that was deleted.
    const stale = {
      spaces: {
        deleted: { done: false, failures: 0, conflictReissues: 0, stamped: 0 },
        default: { done: false, failures: 0, conflictReissues: 0, stamped: 0 },
      },
      runs: 1,
    };

    const result = await runTask([{ spaceId: 'default' }], stale);

    expect(Object.keys(stateOf(result).spaces)).toEqual(['default']);
  });
});
