/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
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

  it('skips a release with no vendor feed and leaves its hosts out of the write', async () => {
    const { deps } = setup([rhelAgent('a1', '9'), rhelAgent('a10', '10')], async (os) =>
      os.version === '10' ? unavailable(os) : rhel9Feed()
    );

    const summary = await runScan(deps, { signal: new AbortController().signal, runId: 'r1' });

    expect(summary.releases).toEqual({ 'rhel:9': 'matched', 'rhel:10': 'unavailable' });
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
      })
    );
    const { signal } = new AbortController();
    const runner = definition.createTaskRunner({
      taskInstance: { id: SCAN_TASK_ID } as ConcreteTaskInstance,
      signal,
      executionUuid: 'exec-1',
    } as Parameters<typeof definition.createTaskRunner>[0]);
    await expect(runner.run()).resolves.toEqual({ state: {} });
    expect(getDeps).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0][1].runId).toBe('exec-1');
  });

  it('rethrows a scan failure so Task Manager records the run as failed', async () => {
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
    await expect(runner.run()).rejects.toBeInstanceOf(ScanFailedError);
  });
});

describe('scheduleScanTask', () => {
  it('schedules a daily scan when none exists', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.get.mockRejectedValue(new Error('Not found'));
    await scheduleScanTask(taskManager);
    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: SCAN_TASK_ID,
      taskType: SCAN_TASK_TYPE,
      schedule: { interval: '1d' },
      params: {},
      state: {},
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
