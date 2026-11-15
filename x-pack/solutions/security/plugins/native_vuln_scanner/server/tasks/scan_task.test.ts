/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { parseRhelOval } from '../lib/feeds/rhel_oval';
import type { FeedOs, LoadFeedResult } from '../lib/feeds/fetch';
import type { AgentInventoryRows } from '../lib/inventory';
import { findInventoryScheduleIds, readAgentInventories } from '../lib/inventory';
import { ensureFindingsIndex, writeFindings } from '../lib/findings';
import type { ScanDeps } from './scan_task';
import { MAX_STATE_MESSAGE_LENGTH, stateSchemaByVersion, truncate } from './task_state';
import {
  registerScanTask,
  runScan,
  ScanFailedError,
  scheduleScanTask,
  SCAN_TASK_ID,
  SCAN_TASK_TYPE,
} from './scan_task';

jest.mock('../lib/inventory', () => ({
  ...jest.requireActual('../lib/inventory'),
  findInventoryScheduleIds: jest.fn(),
  readAgentInventories: jest.fn(),
}));
jest.mock('../lib/findings', () => ({
  ...jest.requireActual('../lib/findings'),
  ensureFindingsIndex: jest.fn(),
  writeFindings: jest.fn(),
}));

const findIdsMock = findInventoryScheduleIds as jest.MockedFunction<
  typeof findInventoryScheduleIds
>;
const readMock = readAgentInventories as jest.MockedFunction<typeof readAgentInventories>;
const ensureMock = ensureFindingsIndex as jest.MockedFunction<typeof ensureFindingsIndex>;
const writeMock = writeFindings as jest.MockedFunction<typeof writeFindings>;

// Five definitions trimmed from rhel-9.oval.xml; giflib is fixed in 0:5.2.1-10.el9_8.1.
const rhelFixture = readFileSync(
  join(__dirname, '..', 'lib', 'feeds', '__fixtures__', 'rhel_9_trimmed.oval.xml')
);

const rhelAgent = (agentId: string, major: string): AgentInventoryRows => ({
  agentId,
  hostName: `host-${agentId}`,
  os: { platform: 'rhel', major, platform_like: 'rhel', name: `Red Hat Enterprise Linux ${major}` },
  rpm: [
    {
      name: 'giflib',
      version: '5.2.1',
      release: '9.el9',
      arch: 'x86_64',
      source: 'giflib-5.2.1-9.el9.src.rpm',
    },
  ],
});

const ubuntuAgent = (agentId: string): AgentInventoryRows => ({
  agentId,
  os: { platform: 'ubuntu', codename: 'noble', major: '24.04', name: 'Ubuntu 24.04 LTS' },
  deb: [{ name: 'apt', version: '2.7.14build2', source: 'apt', status: 'install ok installed' }],
});

async function* rows(agents: AgentInventoryRows[]) {
  yield* agents;
}

const rhel9Feed = async (): Promise<LoadFeedResult> => ({
  status: 'ok',
  feed: await parseRhelOval([rhelFixture], { major: '9' }),
});

const setup = (
  agents: AgentInventoryRows[],
  load: (os: FeedOs) => Promise<LoadFeedResult> = rhel9Feed
) => {
  findIdsMock.mockResolvedValue({ rpm_packages: ['uuid-rpm'], os_version: ['uuid-os'] });
  readMock.mockImplementation(() => rows(agents));
  ensureMock.mockResolvedValue(undefined);
  writeMock.mockImplementation(async (_es, { findings }) => ({
    written: findings.length,
    fixed: 1,
    fixSkipped: 0,
    failures: {},
  }));
  const loadFeed = jest.fn(load);
  const deps: ScanDeps = {
    es: elasticsearchServiceMock.createElasticsearchClient(),
    packRepository: savedObjectsRepositoryMock.create(),
    logger: loggingSystemMock.createLogger(),
    loadFeed,
    now: () => new Date('2026-11-13T00:00:00.000Z'),
  };
  return { deps, loadFeed };
};

const unavailable = (os: FeedOs): LoadFeedResult => ({
  status: 'unavailable',
  url: `https://example.invalid/${os.family}-${os.version}`,
});

describe('runScan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does nothing when the inventory pack is not installed', async () => {
    const { deps, loadFeed } = setup([]);
    findIdsMock.mockResolvedValue({});
    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
    expect(summary.hosts).toBe(0);
    expect(summary.packMissing).toBe(true);
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('osquery pack found'));
    expect(readMock).not.toHaveBeenCalled();
    expect(ensureMock).not.toHaveBeenCalled();
    expect(loadFeed).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('reads the inventory, matches each release against its feed and writes the findings', async () => {
    const { deps, loadFeed } = setup([rhelAgent('a1', '9'), rhelAgent('a2', '9')]);
    const { signal } = new AbortController();

    const summary = await runScan(deps, { signal, runId: 'r1' });

    expect(ensureMock).toHaveBeenCalledWith(deps.es);
    expect(readMock).toHaveBeenCalledWith(deps.es, {
      scheduleIds: { rpm_packages: ['uuid-rpm'], os_version: ['uuid-os'] },
      signal,
    });
    expect(loadFeed).toHaveBeenCalledTimes(1);
    expect(loadFeed).toHaveBeenCalledWith({ family: 'rhel', version: '9' }, { signal });
    expect(writeMock).toHaveBeenCalledTimes(1);
    const [, params] = writeMock.mock.calls[0];
    expect(params.hosts.map(({ id }) => id)).toEqual(['a1', 'a2']);
    expect(params.runId).toBe('r1');
    expect(params.now).toBe('2026-11-13T00:00:00.000Z');
    expect(params.signal).toBe(signal);
    expect(new Set(params.findings.map(({ hostId }) => hostId))).toEqual(new Set(['a1', 'a2']));
    expect(params.findings.every(({ package: pkg }) => pkg.name === 'giflib')).toBe(true);
    expect(summary).toEqual(
      expect.objectContaining({
        hosts: 2,
        releases: { 'rhel:9': 'matched' },
        findings: params.findings.length,
        fixed: 1,
        aborted: false,
      })
    );
    expect(summary.findings).toBeGreaterThan(0);
  });

  it('warns when the pack exists but no agent has reported inventory', async () => {
    const { deps } = setup([]);
    await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });
    expect(deps.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no agent has reported inventory')
    );
  });

  it('skips a release with no vendor feed and leaves its hosts out of the write', async () => {
    const { deps } = setup([rhelAgent('a1', '9'), rhelAgent('a10', '10')], async (os) =>
      os.version === '10' ? unavailable(os) : rhel9Feed()
    );

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(summary.releases).toEqual({ 'rhel:9': 'matched', 'rhel:10': 'unavailable' });
    expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('No advisory feed'));
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0][1].hosts.map(({ id }) => id)).toEqual(['a1']);
  });

  it('writes the other releases and then throws when one release fails', async () => {
    const { deps } = setup([ubuntuAgent('u1'), rhelAgent('a1', '9')], async (os) => {
      if (os.family === 'ubuntu') throw new Error('Advisory feed returned HTTP 503');
      return rhel9Feed();
    });

    const error = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' }).catch(
      (e: Error) => e
    );

    expect(error).toBeInstanceOf(ScanFailedError);
    expect((error as ScanFailedError).failures).toEqual({
      'ubuntu:noble': 'Advisory feed returned HTTP 503',
    });
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0][1].hosts.map(({ id }) => id)).toEqual(['a1']);
  });

  it('stops before the next release once aborted', async () => {
    const controller = new AbortController();
    const { deps, loadFeed } = setup([rhelAgent('a1', '9'), ubuntuAgent('u1')], async (os) => {
      controller.abort();
      return unavailable(os);
    });

    const summary = await runScan(deps, { signal: controller.signal, runId: 'r1' });

    expect(loadFeed).toHaveBeenCalledTimes(1);
    expect(summary.aborted).toBe(true);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('reports an abort mid-release as aborted, not as a failed release', async () => {
    const controller = new AbortController();
    const { deps } = setup([rhelAgent('a1', '9')], async () => {
      controller.abort();
      throw new Error('This operation was aborted');
    });

    const summary = await runScan(deps, { signal: controller.signal, runId: 'r1' });

    expect(summary.aborted).toBe(true);
    expect(summary.releases).toEqual({});
  });
});

describe('registerScanTask', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers a long-running, deferrable task that runs one scan', async () => {
    const taskManager = taskManagerMock.createSetup();
    const { deps } = setup([rhelAgent('a1', '9')]);
    const getDeps = jest.fn(async () => deps);

    registerScanTask(taskManager, getDeps);

    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
    expect(definition).toEqual(
      expect.objectContaining({
        timeout: '30m',
        cost: TaskCost.ExtraLarge,
        priority: TaskPriority.Deferrable,
        stateSchemaByVersion,
      })
    );
    const { signal } = new AbortController();
    const runner = definition.createTaskRunner({
      taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
      signal,
      executionUuid: 'exec-1',
    } as Parameters<typeof definition.createTaskRunner>[0]);
    await expect(runner.run()).resolves.toEqual({
      state: {
        lastRun: expect.objectContaining({
          runId: 'exec-1',
          finishedAt: '2026-11-13T00:00:00.000Z',
          status: 'success',
          hosts: 1,
          releases: { 'rhel:9': 'matched' },
        }),
      },
    });
    expect(getDeps).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0][1].runId).toBe('exec-1');
  });

  it('returns a scan failure with the failed run recorded in the task state', async () => {
    const taskManager = taskManagerMock.createSetup();
    const { deps } = setup([rhelAgent('a1', '9')], async () => {
      throw new Error('boom');
    });
    registerScanTask(taskManager, async () => deps);
    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
    const runner = definition.createTaskRunner({
      taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
      signal: new AbortController().signal,
      executionUuid: 'exec-1',
    } as Parameters<typeof definition.createTaskRunner>[0]);

    const result = await runner.run();

    expect(result).toEqual({
      state: {
        lastRun: expect.objectContaining({
          runId: 'exec-1',
          status: 'failed',
          error: expect.stringContaining('boom'),
        }),
      },
      error: expect.any(ScanFailedError),
    });
  });

  it('stamps finishedAt after the scan, on success and on failure', async () => {
    const ticking = () => {
      let calls = 0;
      const now = jest.fn(() => new Date(Date.UTC(2026, 10, 13, 0, 0, calls++)));
      return now;
    };
    for (const failing of [false, true]) {
      const taskManager = taskManagerMock.createSetup();
      const { deps } = setup(
        [rhelAgent('a1', '9')],
        failing
          ? async () => {
              throw new Error('boom');
            }
          : rhel9Feed
      );
      const now = ticking();
      registerScanTask(taskManager, async () => ({ ...deps, now }));
      const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
      const runner = definition.createTaskRunner({
        taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
        signal: new AbortController().signal,
        executionUuid: 'exec-1',
      } as Parameters<typeof definition.createTaskRunner>[0]);

      const result = await runner.run();

      const { lastRun } = result?.state as { lastRun: { finishedAt: string } };
      const lastTick = now.mock.results[now.mock.results.length - 1].value as Date;
      expect(lastRun.finishedAt).toBe(lastTick.toISOString());
      // The scan itself read the clock before the run was stamped.
      expect(now.mock.calls.length).toBe(failing ? 1 : 2);
    }
  });

  it('keeps the per-release failures and the partial summary in the failed run', async () => {
    const taskManager = taskManagerMock.createSetup();
    const { deps } = setup([ubuntuAgent('u1'), rhelAgent('a1', '9')], async (os) => {
      if (os.family === 'ubuntu') throw new Error('x'.repeat(MAX_STATE_MESSAGE_LENGTH + 50));
      return rhel9Feed();
    });
    registerScanTask(taskManager, async () => deps);
    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
    const runner = definition.createTaskRunner({
      taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
      signal: new AbortController().signal,
      executionUuid: 'exec-1',
    } as Parameters<typeof definition.createTaskRunner>[0]);

    const result = await runner.run();

    const { lastRun } = result?.state as { lastRun: Record<string, unknown> };
    expect(lastRun).toMatchObject({
      status: 'failed',
      hosts: 2,
      findings: expect.any(Number),
      releases: { 'ubuntu:noble': 'failed', 'rhel:9': 'matched' },
    });
    expect(lastRun.findings).toBeGreaterThan(0);
    const failures = lastRun.failures as Record<string, string>;
    expect(Object.keys(failures)).toEqual(['ubuntu:noble']);
    expect(failures['ubuntu:noble']).toHaveLength(MAX_STATE_MESSAGE_LENGTH);
    expect(() => stateSchemaByVersion[1].schema.validate(result?.state)).not.toThrow();
  });

  describe('when Task Manager aborts the run at its timeout', () => {
    const runAborted = async (
      load: (os: FeedOs, controller: AbortController) => Promise<LoadFeedResult>
    ) => {
      const controller = new AbortController();
      const taskManager = taskManagerMock.createSetup();
      const { deps } = setup([rhelAgent('a1', '9'), ubuntuAgent('u1')], (os) =>
        load(os, controller)
      );
      registerScanTask(taskManager, async () => deps);
      const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
      const runner = definition.createTaskRunner({
        taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
        signal: controller.signal,
        executionUuid: 'exec-1',
      } as Parameters<typeof definition.createTaskRunner>[0]);
      return runner.run();
    };

    const expectAbortedRun = (result: Awaited<ReturnType<typeof runAborted>>) => {
      expect(result).not.toHaveProperty('error');
      expect(result?.state.lastRun).not.toHaveProperty('error');
      expect(result?.state.lastRun).toMatchObject({
        runId: 'exec-1',
        status: 'aborted',
        hosts: 2,
        releases: { 'rhel:9': 'matched' },
      });
      const { lastRun } = result?.state as { lastRun: { findings: number } };
      expect(lastRun.findings).toBeGreaterThan(0);
      expect(() => stateSchemaByVersion[1].schema.validate(result?.state)).not.toThrow();
    };

    it('records an abort between releases as aborted and keeps the partial result', async () => {
      const result = await runAborted(async (os, controller) => {
        if (os.family !== 'rhel') throw new Error('the aborted scan must not load another release');
        const feed = await rhel9Feed();
        controller.abort();
        return feed;
      });

      expectAbortedRun(result);
      expect(writeMock).toHaveBeenCalledTimes(1);
    });

    it('records an AbortError thrown inside a release as aborted, not failed', async () => {
      const result = await runAborted(async (os, controller) => {
        if (os.family === 'rhel') return rhel9Feed();
        controller.abort();
        throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
      });

      expectAbortedRun(result);
    });

    describe('before the release loop', () => {
      const runInventoryRead = async (abortSignal: boolean) => {
        const controller = new AbortController();
        const taskManager = taskManagerMock.createSetup();
        const { deps } = setup([rhelAgent('a1', '9')]);
        readMock.mockImplementation(() => {
          if (abortSignal) controller.abort();
          throw Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
        });
        registerScanTask(taskManager, async () => deps);
        const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
        const runner = definition.createTaskRunner({
          taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
          signal: controller.signal,
          executionUuid: 'exec-1',
        } as Parameters<typeof definition.createTaskRunner>[0]);
        return { result: await runner.run(), loadFeed: deps.loadFeed };
      };

      it('records an abort while reading the inventory as aborted, not failed', async () => {
        const { result, loadFeed } = await runInventoryRead(true);

        expect(result).not.toHaveProperty('error');
        expect(result?.state.lastRun).not.toHaveProperty('error');
        expect(result?.state.lastRun).toMatchObject({
          runId: 'exec-1',
          status: 'aborted',
          hosts: 0,
          findings: 0,
          releases: {},
        });
        expect(() => stateSchemaByVersion[1].schema.validate(result?.state)).not.toThrow();
        expect(loadFeed).not.toHaveBeenCalled();
      });

      it('still records the same error as failed while the signal is not aborted', async () => {
        const { result } = await runInventoryRead(false);

        expect(result).toEqual({
          state: {
            lastRun: expect.objectContaining({
              runId: 'exec-1',
              status: 'failed',
              error: 'This operation was aborted',
            }),
          },
          error: expect.objectContaining({ name: 'AbortError' }),
        });
        expect(() => stateSchemaByVersion[1].schema.validate(result?.state)).not.toThrow();
      });
    });
  });

  it('records a run without the inventory pack as no_pack', async () => {
    const taskManager = taskManagerMock.createSetup();
    const { deps } = setup([]);
    findIdsMock.mockResolvedValue({});
    registerScanTask(taskManager, async () => deps);
    const definition = taskManager.registerTaskDefinitions.mock.calls[0][0][SCAN_TASK_TYPE];
    const runner = definition.createTaskRunner({
      taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
      signal: new AbortController().signal,
      executionUuid: 'exec-2',
    } as Parameters<typeof definition.createTaskRunner>[0]);

    await expect(runner.run()).resolves.toEqual({
      state: { lastRun: expect.objectContaining({ status: 'no_pack', hosts: 0, findings: 0 }) },
    });
  });
});

describe('scheduleScanTask', () => {
  it('schedules a daily scan when none exists', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', SCAN_TASK_ID)
    );
    await scheduleScanTask(taskManager);
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: SCAN_TASK_ID,
      taskType: SCAN_TASK_TYPE,
      schedule: { interval: '1d' },
      params: {},
      state: {},
    });
  });

  it('rethrows a lookup error that is not a not-found and schedules nothing', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('cluster unavailable'));
    await expect(scheduleScanTask(taskManager)).rejects.toThrow('cluster unavailable');
    expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
  });

  it('does not ask for an immediate scan for a task it just created', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('task', SCAN_TASK_ID)
    );
    await expect(scheduleScanTask(taskManager)).resolves.toBe(false);
  });

  describe('immediate scan decision for an existing task', () => {
    const now = Date.parse('2026-11-15T12:00:00.000Z');
    const existing = (finishedAt?: string, interval = '1d') =>
      ({
        schedule: { interval },
        state: finishedAt ? { lastRun: { finishedAt } } : {},
      } as unknown as ConcreteTaskInstance);

    it.each([
      [
        'skips when a scan finished within the interval',
        existing('2026-11-15T06:00:00.000Z'),
        false,
      ],
      [
        'runs when the last scan is older than the interval',
        existing('2026-11-13T12:00:00.000Z'),
        true,
      ],
      ['runs when no scan ever finished', existing(undefined), true],
      [
        'runs when the last scan is older than a shortened interval',
        existing('2026-11-15T09:00:00.000Z', '1h'),
        true,
      ],
      ['runs when the finish time is unreadable', existing('garbage'), true],
    ])('%s', async (_name, task, expected) => {
      const taskManager = taskManagerMock.createStart();
      taskManager.get.mockResolvedValue(task);
      await expect(scheduleScanTask(taskManager, now)).resolves.toBe(expected);
    });
  });

  it('keeps a schedule that was already changed', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockResolvedValue({
      schedule: { interval: '6h' },
    } as ConcreteTaskInstance);
    await scheduleScanTask(taskManager);
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
      expect.objectContaining({ schedule: { interval: '6h' } })
    );
  });
});

describe('task state schema', () => {
  const { schema, up } = stateSchemaByVersion[1];

  it('accepts the empty state and a recorded run', () => {
    expect(() => schema.validate({})).not.toThrow();
    expect(() =>
      schema.validate({
        lastRun: {
          runId: 'r1',
          finishedAt: '2026-11-13T00:00:00.000Z',
          status: 'failed',
          hosts: 1,
          findings: 0,
          releases: { 'rhel:9': 'failed' },
          failures: { 'rhel:9': 'boom' },
          error: 'boom',
        },
      })
    ).not.toThrow();
  });

  it('migrates an older state to the v1 shape', () => {
    expect(up({})).toEqual({ lastRun: undefined });
    expect(() => schema.validate(up({ unrelated: 1 }))).not.toThrow();
  });

  it('truncates oversized messages of a state written before the bounds existed', () => {
    const long = 'x'.repeat(MAX_STATE_MESSAGE_LENGTH * 2);
    const migrated = up({
      lastRun: {
        runId: 'r1',
        finishedAt: '2026-11-13T00:00:00.000Z',
        status: 'failed',
        hosts: 1,
        findings: 0,
        releases: { 'rhel:9': 'failed' },
        failures: { 'rhel:9': long },
        error: long,
      },
    });
    expect(() => schema.validate(migrated)).not.toThrow();
    expect(migrated.lastRun?.error).toHaveLength(MAX_STATE_MESSAGE_LENGTH);
    expect(migrated.lastRun?.failures?.['rhel:9']).toHaveLength(MAX_STATE_MESSAGE_LENGTH);
  });

  it('rejects unbounded messages and maps', () => {
    const lastRun = {
      runId: 'r1',
      finishedAt: 'now',
      status: 'failed',
      hosts: 0,
      findings: 0,
      releases: {},
    };
    expect(() =>
      schema.validate({ lastRun: { ...lastRun, error: 'x'.repeat(MAX_STATE_MESSAGE_LENGTH + 1) } })
    ).toThrow();
    expect(() =>
      schema.validate({
        lastRun: {
          ...lastRun,
          releases: Object.fromEntries(Array.from({ length: 501 }, (_, i) => [`r${i}`, 'matched'])),
        },
      })
    ).toThrow();
  });
});

describe('truncate', () => {
  it('leaves text within the bound alone', () => {
    expect(truncate('abc', 3)).toBe('abc');
  });

  it('cuts at the bound', () => {
    expect(truncate('abcdef', 3)).toBe('abc');
  });

  it('does not split a surrogate pair at the cut', () => {
    // '😀' is two UTF-16 code units; a cut after the first would leave a lone surrogate.
    expect(truncate('ab😀cd', 3)).toBe('ab');
    expect(truncate('ab😀cd', 4)).toBe('ab😀');
  });
});
