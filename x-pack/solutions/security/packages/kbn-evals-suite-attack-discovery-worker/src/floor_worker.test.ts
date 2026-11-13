/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { RUNNER_WORKFLOW_ID } from './constants';
import {
  enableFloorWorker,
  ensureFloorServiceAccount,
  FLOOR_WORKER_ID,
  settleEnableTimeRun,
} from './floor_worker';

jest.mock('./kibana_api', () => ({
  ...jest.requireActual('./kibana_api'),
  // Advances the fake clock, so a bounded wait ends instead of spinning on the real one.
  sleep: jest.fn(async (ms: number) => {
    jest.advanceTimersByTime(ms);
  }),
}));

const floorYamlDispatching = (workflowId: string) =>
  `settings:\n  run_as: "kibana/alertzero_attack_discovery"\nsteps:\n  - name: run_attack_discovery\n    type: workflow.execute\n    with:\n      workflow-id: ${workflowId}\n`;
const CLEAN_FLOOR_YAML = floorYamlDispatching(RUNNER_WORKFLOW_ID);
const REWRITTEN_FLOOR_YAML = floorYamlDispatching('system-security-attack-discovery-review');
/** The floor workflow as the fake Kibana stores it; a test changes it to simulate a leftover. */
let floorYaml = CLEAN_FLOOR_YAML;

beforeEach(() => {
  floorYaml = CLEAN_FLOOR_YAML;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const log = {
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;
const NAME = 'alertzero_attack_discovery';
const usable = { id: 'sa-1', name: NAME, enabled: true, assumable: true };

interface CallOptions {
  method?: string;
  query?: { statuses?: string[]; omitStepRuns?: boolean; size?: number };
}
type Handler = (path: string, options?: CallOptions) => unknown;
const FLOOR_WORKFLOW_PATH = /\/api\/workflows\/workflow\/[^/?]+$/;
const fetchWith = (handler: Handler) =>
  jest.fn(async (path: string, o?: CallOptions) =>
    FLOOR_WORKFLOW_PATH.test(path) && (o?.method ?? 'GET') === 'GET'
      ? { yaml: floorYaml, enabled: true }
      : handler(path, o)
  );

describe('ensureFloorServiceAccount', () => {
  it('reuses an enabled, assumable account', async () => {
    const fetch = fetchWith(() => ({ serviceAccounts: [usable], nextPage: null }));
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).resolves.toBe(
      'sa-1'
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('creates the account with the reserved built-in role when missing', async () => {
    const fetch = fetchWith((path, o) => {
      if (path.includes('/api/security/role/')) return { metadata: { _reserved: true } };
      if (o?.method === 'POST') return { id: 'sa-new' };
      return { serviceAccounts: [], nextPage: null };
    });
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).resolves.toBe(
      'sa-new'
    );
    const post = fetch.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse((post?.[1] as { body: string }).body)).toMatchObject({
      name: NAME,
      roles: [NAME],
    });
  });

  it('refuses a role that is not reserved', async () => {
    const fetch = fetchWith((path) =>
      path.includes('/api/security/role/')
        ? { metadata: {} }
        : { serviceAccounts: [], nextPage: null }
    );
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).rejects.toThrow(
      /not a reserved/
    );
  });

  it('looks the account up again after a 409 on create', async () => {
    let lists = 0;
    const fetch = fetchWith((path, o) => {
      if (path.includes('/api/security/role/')) return { metadata: { _reserved: true } };
      if (o?.method === 'POST') throw Object.assign(new Error('conflict'), { status: 409 });
      lists += 1;
      return { serviceAccounts: lists > 1 ? [usable] : [], nextPage: null };
    });
    await expect(ensureFloorServiceAccount(fetch as unknown as HttpHandler, log)).resolves.toBe(
      'sa-1'
    );
  });
});

describe('enableFloorWorker', () => {
  const worker = (over: Record<string, unknown>) => ({
    id: FLOOR_WORKER_ID,
    enabled: false,
    settingsRevision: 3,
    ...over,
  });

  const run = (before: Record<string, unknown>, after: Record<string, unknown>) => {
    let reads = 0;
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') return {};
      if (path.includes('/executions')) return { results: [] };
      reads += 1;
      return { workers: [reads === 1 ? worker(before) : worker(after)] };
    });
    return {
      fetch,
      promise: enableFloorWorker({
        fetch: fetch as unknown as HttpHandler,
        log,
        serviceAccountId: 'sa-1',
      }),
    };
  };

  const patches = (fetch: jest.Mock) =>
    fetch.mock.calls
      .filter(([, o]) => o?.method === 'PATCH')
      .map(([, o]) => JSON.parse((o as { body: string }).body));

  it('enables with manual autonomy and a long interval, then disables on restore', async () => {
    const { fetch, promise } = run({}, { enabled: true, workflowId: 'wf-1' });
    const enabled = await promise;
    expect(enabled.workflowId).toBe('wf-1');
    expect(patches(fetch)[0]).toMatchObject({
      enabled: true,
      settingsRevision: 3,
      settings: { serviceAccountId: 'sa-1', autonomy: 'manual', scheduleInterval: '24h' },
    });
    await enabled.restore();
    expect(patches(fetch)[1]).toEqual({ enabled: false });
  });

  it('puts back the settings of a worker that was already enabled, without disabling it', async () => {
    const previous = {
      serviceAccountId: 'sa-old',
      autonomy: 'supervised',
      scheduleInterval: '30m',
    };
    const { fetch, promise } = run(
      { enabled: true, settings: previous },
      { enabled: true, workflowId: 'wf-1' }
    );
    await (await promise).restore();
    const [, restored] = patches(fetch);
    expect(restored).toEqual({ settingsRevision: 3, settings: previous });
    expect(restored.enabled).toBeUndefined();
  });

  it('fails when the worker is blocked', async () => {
    const { promise } = run({ blockingReasons: ['no_model'] }, {});
    await expect(promise).rejects.toThrow(/no_model/);
  });

  it('fails when the worker does not come up enabled', async () => {
    const { promise } = run({}, { enabled: false });
    await expect(promise).rejects.toThrow(/did not enable/);
  });

  it('puts the worker back and rethrows the original error when the enable-time settle throws', async () => {
    let reads = 0;
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') return {};
      if (path.includes('/executions')) throw new Error('listing failed');
      reads += 1;
      return {
        workers: [
          reads === 1
            ? worker({})
            : worker({ enabled: true, workflowId: 'wf-1', settingsRevision: 4 }),
        ],
      };
    });
    await expect(
      enableFloorWorker({ fetch: fetch as unknown as HttpHandler, log, serviceAccountId: 'sa-1' })
    ).rejects.toThrow(/listing failed/);
    expect(patches(fetch)).toHaveLength(2);
    expect(patches(fetch)[1]).toEqual({ enabled: false });
  });

  it('puts back the previous settings, with no enabled key, when a worker that was already enabled fails to settle', async () => {
    const previous = {
      serviceAccountId: 'sa-old',
      autonomy: 'supervised',
      scheduleInterval: '30m',
    };
    let reads = 0;
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') return {};
      if (path.includes('/executions')) throw new Error('listing failed');
      reads += 1;
      return {
        workers: [
          reads === 1
            ? worker({ enabled: true, settings: previous })
            : worker({ enabled: true, workflowId: 'wf-1', settingsRevision: 4 }),
        ],
      };
    });
    await expect(
      enableFloorWorker({ fetch: fetch as unknown as HttpHandler, log, serviceAccountId: 'sa-1' })
    ).rejects.toThrow(/listing failed/);
    const [, restored] = patches(fetch);
    expect(restored).toEqual({ settingsRevision: 4, settings: previous });
    expect(restored.enabled).toBeUndefined();
  });

  it('attempts a restore and rethrows the original error when the enabling PATCH itself rejects', async () => {
    let reads = 0;
    const attempted: unknown[] = [];
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') {
        const body = JSON.parse((o as { body: string }).body);
        attempted.push(body);
        if (body.enabled === true) throw new Error('request timed out');
        return {};
      }
      reads += 1;
      return { workers: [worker({ settingsRevision: reads })] };
    });
    await expect(
      enableFloorWorker({ fetch: fetch as unknown as HttpHandler, log, serviceAccountId: 'sa-1' })
    ).rejects.toThrow(/request timed out/);
    expect(attempted[1]).toEqual({ enabled: false });
  });

  it('puts the worker back when the read-back says it did not enable', async () => {
    const { fetch, promise } = run({}, { enabled: false });
    await expect(promise).rejects.toThrow(/did not enable/);
    expect(patches(fetch)[1]).toEqual({ enabled: false });
  });

  it('rethrows the original error when the restore itself fails', async () => {
    let reads = 0;
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') {
        if (JSON.parse((o as { body: string }).body).enabled === false) {
          throw new Error('restore refused');
        }
        return {};
      }
      if (path.includes('/executions')) throw new Error('listing failed');
      reads += 1;
      return {
        workers: [reads === 1 ? worker({}) : worker({ enabled: true, workflowId: 'wf-1' })],
      };
    });
    await expect(
      enableFloorWorker({ fetch: fetch as unknown as HttpHandler, log, serviceAccountId: 'sa-1' })
    ).rejects.toThrow(/listing failed/);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining('restore refused'));
  });
});

describe('a floor left rewritten by an interrupted floor-parent run', () => {
  const worker = (over: Record<string, unknown>) => ({
    id: FLOOR_WORKER_ID,
    enabled: false,
    settingsRevision: 3,
    ...over,
  });
  const patches = (fetch: jest.Mock) =>
    fetch.mock.calls
      .filter(([, o]) => o?.method === 'PATCH')
      .map(([, o]) => JSON.parse((o as { body: string }).body));

  /**
   * A Kibana that, like the real one (verified live), re-renders the floor from the registry only
   * when a settings write changes the schedule interval. Like Task Manager, it runs the floor at
   * once when a write leaves the worker enabled (`ticks` records what each run dispatched).
   * `failPatches` makes the nth PATCHes reject.
   */
  const kibana = ({
    rerenderRepairs = true,
    startEnabled = false,
    failPatches = [],
  }: { rerenderRepairs?: boolean; startEnabled?: boolean; failPatches?: number[] } = {}) => {
    let interval = '24h';
    let enabled = startEnabled;
    let patchCount = 0;
    const ticks: string[] = [];
    const calls: string[] = [];
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') {
        patchCount += 1;
        if (failPatches.includes(patchCount)) {
          throw Object.assign(new Error('patch failed'), { status: 409 });
        }
        const body = JSON.parse((o as unknown as { body: string }).body);
        const next = body.settings?.scheduleInterval;
        if (next !== undefined && next !== interval && rerenderRepairs)
          floorYaml = CLEAN_FLOOR_YAML;
        if (next !== undefined) interval = next;
        if (body.enabled !== undefined) enabled = body.enabled;
        calls.push(JSON.stringify({ enabled: body.enabled, interval: next }));
        if (enabled && (body.enabled === true || next !== undefined)) {
          ticks.push(floorYaml === CLEAN_FLOOR_YAML ? 'runner' : 'review');
        }
        return {};
      }
      if (path.includes('/executions')) return { results: [] };
      return {
        workers: [
          worker({
            enabled,
            workflowId: 'wf-1',
            settingsRevision: 4 + patchCount,
            settings: { scheduleInterval: interval },
          }),
        ],
      };
    });
    return Object.assign(fetch, { ticks, calls, interval: () => interval });
  };
  const enable = (fetch: jest.Mock) =>
    enableFloorWorker({ fetch: fetch as unknown as HttpHandler, log, serviceAccountId: 'sa-1' });

  it('is repaired by re-rendering the floor (a changed, then restored, interval) before the worker is enabled', async () => {
    floorYaml = REWRITTEN_FLOOR_YAML;
    const fetch = kibana();
    const enabled = await enable(fetch);
    expect(enabled.workflowId).toBe('wf-1');
    expect(patches(fetch).map(({ settings }) => settings?.scheduleInterval)).toEqual([
      '25h',
      '24h',
      '24h',
    ]);
    // The two repair writes leave the worker off; only the last one enables it.
    expect(patches(fetch).map(({ enabled: flag }) => flag)).toEqual([undefined, undefined, true]);
    expect(floorYaml).toBe(CLEAN_FLOOR_YAML);
    expect(log.warning).toHaveBeenCalledWith(expect.stringMatching(/not dispatching the runner/));
  });

  it('never lets the enable-time tick dispatch a leftover rewritten floor', async () => {
    floorYaml = REWRITTEN_FLOOR_YAML;
    const fetch = kibana();
    await enable(fetch);
    expect(fetch.ticks).toEqual(['runner']);
  });

  it('disables a worker that is already enabled before repairing its floor, and enables it again', async () => {
    floorYaml = REWRITTEN_FLOOR_YAML;
    const fetch = kibana({ startEnabled: true });
    await enable(fetch);
    const sent = patches(fetch);
    expect(sent[0]).toEqual({ enabled: false });
    expect(fetch.ticks).toEqual(['runner']);
    expect(sent[sent.length - 1].enabled).toBe(true);
  });

  it('fails loudly when the re-render does not make the floor dispatch the runner', async () => {
    floorYaml = REWRITTEN_FLOOR_YAML;
    const fetch = kibana({ rerenderRepairs: false });
    await expect(enable(fetch)).rejects.toThrow(/does not dispatch .*interrupted/);
    expect(fetch.ticks).toEqual([]);
  });

  it('says which interval the worker was left at when the second repair write fails twice', async () => {
    floorYaml = REWRITTEN_FLOOR_YAML;
    // Writes: 1 the nudge, 2 and 3 the put-back and its retry.
    const fetch = kibana({ failPatches: [2, 3] });
    const promise = enable(fetch);
    await expect(promise).rejects.toThrow(/left at 25h .*patch failed/);
  });

  it('retries the second repair write once', async () => {
    floorYaml = REWRITTEN_FLOOR_YAML;
    const fetch = kibana({ failPatches: [2] });
    await enable(fetch);
    expect(fetch.interval()).toBe('24h');
    expect(floorYaml).toBe(CLEAN_FLOOR_YAML);
  });

  it('leaves a clean floor alone', async () => {
    const fetch = kibana();
    await enable(fetch);
    expect(patches(fetch).map(({ enabled: flag }) => flag)).toEqual([true]);
  });

  it('fails the teardown when the floor is still rewritten after the worker is put back', async () => {
    const stuck = kibana({ rerenderRepairs: false });
    const enabled = await enable(stuck);
    floorYaml = REWRITTEN_FLOOR_YAML;
    await expect(enabled.restore()).rejects.toThrow(/does not dispatch/);
  });

  it('leaves a worker that is disabled on restore with a floor that dispatches the runner', async () => {
    const fetch = kibana();
    const enabled = await enable(fetch);
    await expect(enabled.restore()).resolves.toBeUndefined();
    expect(floorYaml).toBe(CLEAN_FLOOR_YAML);
  });

  it('repairs a floor found rewritten at restore only while the worker is disabled', async () => {
    const fetch = kibana();
    const enabled = await enable(fetch);
    floorYaml = REWRITTEN_FLOOR_YAML;
    fetch.ticks.length = 0;
    fetch.calls.length = 0;
    await enabled.restore();
    // Disable first, then the nudge writes (no enabled key, no tick), and the worker ends disabled.
    expect(fetch.calls[0]).toBe(JSON.stringify({ enabled: false }));
    expect(fetch.ticks).toEqual([]);
    expect(floorYaml).toBe(CLEAN_FLOOR_YAML);
  });

  it('puts a worker that was already enabled back on after repairing its floor at restore', async () => {
    const previous = {
      serviceAccountId: 'sa-old',
      autonomy: 'supervised',
      scheduleInterval: '30m',
    };
    let enabled = true;
    let interval = '30m';
    const writes: unknown[] = [];
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') {
        const body = JSON.parse((o as unknown as { body: string }).body);
        writes.push(body);
        if (body.settings?.scheduleInterval !== undefined) {
          if (body.settings.scheduleInterval !== interval) floorYaml = CLEAN_FLOOR_YAML;
          interval = body.settings.scheduleInterval;
        }
        if (body.enabled !== undefined) enabled = body.enabled;
        return {};
      }
      if (path.includes('/executions')) return { results: [] };
      return {
        workers: [
          worker({
            enabled,
            workflowId: 'wf-1',
            settings: { ...previous, scheduleInterval: interval },
          }),
        ],
      };
    });
    const handle = await enableFloorWorker({
      fetch: fetch as unknown as HttpHandler,
      log,
      serviceAccountId: 'sa-1',
    });
    floorYaml = REWRITTEN_FLOOR_YAML;
    writes.length = 0;
    await handle.restore();
    expect(writes[0]).toEqual({ enabled: false });
    expect(writes[writes.length - 1]).toMatchObject({ enabled: true, settings: previous });
    expect(floorYaml).toBe(CLEAN_FLOOR_YAML);
  });

  describe('restore of a worker that was enabled before the eval', () => {
    const previous = {
      serviceAccountId: 'sa-old',
      autonomy: 'supervised',
      scheduleInterval: '30m',
    };
    /** A worker that starts enabled; `failOn` makes the nth PATCH after the setup reject (409 by default). */
    const enabledBefore = async (failOn: number[] = [], timeoutOn: number[] = []) => {
      let enabled = true;
      let interval = '30m';
      let patchesSinceSetup = 0;
      let armed = false;
      const writes: unknown[] = [];
      const fetch = fetchWith((path, o) => {
        if (o?.method === 'PATCH') {
          if (armed) patchesSinceSetup += 1;
          if (armed && failOn.includes(patchesSinceSetup)) {
            throw Object.assign(new Error('revision conflict'), { status: 409 });
          }
          const body = JSON.parse((o as unknown as { body: string }).body);
          writes.push(body);
          if (body.settings?.scheduleInterval !== undefined) {
            if (body.settings.scheduleInterval !== interval) floorYaml = CLEAN_FLOOR_YAML;
            interval = body.settings.scheduleInterval;
          }
          if (body.enabled !== undefined) enabled = body.enabled;
          // Applied by the server, but the client gives up waiting for the response.
          if (armed && timeoutOn.includes(patchesSinceSetup)) throw new Error('request timed out');
          return {};
        }
        if (path.includes('/executions')) return { results: [] };
        return {
          workers: [
            worker({
              enabled,
              workflowId: 'wf-1',
              settings: { ...previous, scheduleInterval: interval },
            }),
          ],
        };
      });
      const handle = await enableFloorWorker({
        fetch: fetch as unknown as HttpHandler,
        log,
        serviceAccountId: 'sa-1',
      });
      armed = true;
      writes.length = 0;
      return { handle, writes, fetch };
    };

    it('retries the restore write once when it fails (a revision conflict)', async () => {
      const { handle, writes } = await enabledBefore([1]);
      await expect(handle.restore()).resolves.toBeUndefined();
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({ settings: previous });
    });

    it('does not retry a restore write that fails with anything but a revision conflict', async () => {
      const { handle, fetch } = await enabledBefore([], [1]);
      const before = (fetch as jest.Mock).mock.calls.filter(
        ([, o]) => o?.method === 'PATCH'
      ).length;
      await expect(handle.restore()).rejects.toThrow(/request timed out/);
      const after = (fetch as jest.Mock).mock.calls.filter(([, o]) => o?.method === 'PATCH').length;
      expect(after - before).toBe(1);
    });

    it('reports a worker left disabled even when the disable request timed out after it was applied', async () => {
      // The disable (first write after the setup) is applied, then the response is lost.
      const { handle } = await enabledBefore([], [1]);
      floorYaml = REWRITTEN_FLOOR_YAML;
      await expect(handle.restore()).rejects.toThrow(
        /request timed out; worker left disabled \(was enabled before the eval\)$/
      );
    });

    it('fails when the restore write fails twice', async () => {
      const { handle } = await enabledBefore([1, 2]);
      await expect(handle.restore()).rejects.toThrow(/revision conflict/);
    });

    it('says the worker was left disabled when the repair half-fails, and does not re-enable it', async () => {
      // Writes after the setup: 1 the disable, 2 the nudge, 3 and 4 the put-back and its retry.
      const { handle, writes } = await enabledBefore([3, 4]);
      floorYaml = REWRITTEN_FLOOR_YAML;
      await expect(handle.restore()).rejects.toThrow(
        /left at 25h .*; worker left disabled \(was enabled before the eval\)$/
      );
      expect(writes.map((body) => (body as { enabled?: boolean }).enabled)).toEqual([
        false,
        undefined,
      ]);
    });
  });
});

describe('settleEnableTimeRun', () => {
  const WF = 'wf-1';
  const isCancel = (path: string) => path.endsWith('/executions/cancel');

  /** `listings` are the active executions returned by successive listings; the last one repeats. */
  const scripted = (listings: string[][]) => {
    let index = 0;
    return fetchWith((path, o) => {
      if (isCancel(path)) return {};
      expect(o?.method).toBe('GET');
      const ids = listings[Math.min(index, listings.length - 1)];
      index += 1;
      return { results: ids.map((id) => ({ id })) };
    });
  };
  const settle = (fetch: jest.Mock, over: Record<string, unknown> = {}) =>
    settleEnableTimeRun({
      fetch: fetch as unknown as HttpHandler,
      log,
      workflowId: WF,
      waitMs: 60_000,
      cancelTimeoutMs: 60_000,
      ...over,
    });
  const cancels = (fetch: jest.Mock) => fetch.mock.calls.filter(([path]) => isCancel(path));

  it('cancels the scheduled run and returns once the workflow is idle', async () => {
    const fetch = scripted([['tick-1'], ['tick-1'], []]);
    await expect(settle(fetch)).resolves.toBe(true);
    expect(cancels(fetch)).toHaveLength(1);
    expect(cancels(fetch)[0][0]).toContain(`/api/workflows/workflow/${WF}/executions/cancel`);
    const [listUrl, listOptions] = fetch.mock.calls[0] as [string, CallOptions];
    expect(listUrl).toContain(`/api/workflows/workflow/${WF}/executions`);
    expect(listOptions.query?.statuses).toEqual(
      expect.arrayContaining(['pending', 'running', 'waiting', 'queued'])
    );
    expect(listOptions.query?.statuses).not.toContain('cancelled');
  });

  it('waits for a tick that appears after enabling', async () => {
    const fetch = scripted([[], [], ['tick-1'], []]);
    await expect(settle(fetch)).resolves.toBe(true);
    expect(cancels(fetch)).toHaveLength(1);
  });

  it('lists with step runs omitted and a page sized to the concurrency slot', async () => {
    const fetch = scripted([['tick-1'], []]);
    await settle(fetch);
    const [, listOptions] = fetch.mock.calls[0] as [string, CallOptions];
    expect(listOptions.query).toMatchObject({ omitStepRuns: true, size: 2 });
  });

  it('logs how many executions it cancelled when there is more than one', async () => {
    (log.warning as jest.Mock).mockClear();
    const fetch = scripted([['tick-1', 'other-2'], []]);
    await settle(fetch);
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringMatching(/cancelling 2 active executions of "wf-1".*must not be shared/)
    );
  });

  it('does not warn when it cancels a single execution', async () => {
    (log.warning as jest.Mock).mockClear();
    await settle(scripted([['tick-1'], []]));
    expect(log.warning).not.toHaveBeenCalledWith(expect.stringMatching(/cancelling \d+ active/));
  });

  it('cancels with a POST', async () => {
    const fetch = scripted([['tick-1'], []]);
    await settle(fetch);
    expect((cancels(fetch)[0][1] as CallOptions).method).toBe('POST');
  });

  it('does not cancel anything when no tick appears within the wait', async () => {
    const fetch = scripted([[]]);
    await expect(settle(fetch, { waitMs: 0 })).resolves.toBe(false);
    expect(cancels(fetch)).toHaveLength(0);
  });

  it('warns that a late tick can still cancel the first row when none appeared', async () => {
    (log.warning as jest.Mock).mockClear();
    await settle(scripted([[]]), { waitMs: 0 });
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringMatching(/late scheduled tick can still cancel the first row/)
    );
    expect(log.warning).not.toHaveBeenCalledWith(expect.stringMatching(/starting rows/));
  });

  it('does not warn when a tick was found and cancelled', async () => {
    (log.warning as jest.Mock).mockClear();
    await settle(scripted([['tick-1'], []]));
    expect(log.warning).not.toHaveBeenCalled();
  });

  it('fails when the cancelled run never leaves its slot', async () => {
    const fetch = scripted([['tick-1']]);
    await expect(settle(fetch, { cancelTimeoutMs: 0 })).rejects.toThrow(
      /still active .* \(tick-1\); a row would race it/
    );
  });

  describe('runner child of the cancelled run', () => {
    /** The floor workflow is idle after the cancel; the runner lists `runnerListings` in turn. */
    const withRunner = (runnerListings: string[][]) => {
      let runnerIndex = 0;
      let floorIndex = 0;
      const floorListings = [['tick-1'], []];
      return fetchWith((path) => {
        if (isCancel(path)) return {};
        if (path.includes(`/workflow/${RUNNER_WORKFLOW_ID}/executions`)) {
          const ids = runnerListings[Math.min(runnerIndex, runnerListings.length - 1)];
          runnerIndex += 1;
          return { results: ids.map((id) => ({ id })) };
        }
        const ids = floorListings[Math.min(floorIndex, floorListings.length - 1)];
        floorIndex += 1;
        return { results: ids.map((id) => ({ id })) };
      });
    };

    it('waits until the runner has no active execution', async () => {
      const fetch = withRunner([['runner-1'], ['runner-1'], []]);
      await expect(settle(fetch)).resolves.toBe(true);
      const runnerListsCount = fetch.mock.calls.filter(
        ([path]) => path.includes(`/workflow/${RUNNER_WORKFLOW_ID}/executions`) && !isCancel(path)
      ).length;
      expect(runnerListsCount).toBe(3);
      // The runner the tick started is cancelled too, not only waited on.
      expect(
        cancels(fetch).filter(([path]) => path.includes(`/workflow/${RUNNER_WORKFLOW_ID}/`))
      ).toHaveLength(1);
    });

    it('fails when the runner never leaves its slot', async () => {
      const fetch = withRunner([['runner-1']]);
      await expect(settle(fetch, { cancelTimeoutMs: 0 })).rejects.toThrow(
        new RegExp(`"${RUNNER_WORKFLOW_ID}" is still active .* \\(runner-1\\); a row would race it`)
      );
    });
  });

  describe('review child of the cancelled run', () => {
    it('cancels a review child the tick started and waits until it is gone', async () => {
      let reviewLists = 0;
      let floorLists = 0;
      const fetch = fetchWith((path) => {
        if (isCancel(path)) return {};
        if (path.includes('/workflow/system-security-attack-discovery-review/executions')) {
          reviewLists += 1;
          return { results: reviewLists <= 2 ? [{ id: 'review-1' }] : [] };
        }
        if (path.includes(`/workflow/${RUNNER_WORKFLOW_ID}/executions`)) return { results: [] };
        floorLists += 1;
        return { results: floorLists === 1 ? [{ id: 'tick-1' }] : [] };
      });
      await expect(settle(fetch)).resolves.toBe(true);
      const reviewCancels = cancels(fetch).filter(([path]) =>
        path.includes('/workflow/system-security-attack-discovery-review/')
      );
      expect(reviewCancels).toHaveLength(1);
      expect(reviewLists).toBeGreaterThan(2);
    });

    it('fails when the review never leaves its slot', async () => {
      const floorListings = scripted([['tick-1'], []]);
      const fetch = jest.fn(async (path: string, o?: CallOptions) => {
        if (path.includes('/workflow/system-security-attack-discovery-review/executions')) {
          return path.endsWith('/cancel') ? {} : { results: [{ id: 'review-1' }] };
        }
        if (path.includes(`/workflow/${RUNNER_WORKFLOW_ID}/`)) return { results: [] };
        return floorListings(path, o);
      });
      await expect(settle(fetch, { cancelTimeoutMs: 0 })).rejects.toThrow(
        /system-security-attack-discovery-review" is still active .* \(review-1\)/
      );
    });
  });

  it('fails with a clear message, not as idle, when the listing request errors', async () => {
    const fetch = fetchWith(() => {
      throw Object.assign(new Error('Service Unavailable'), { status: 503 });
    });
    await expect(settle(fetch)).rejects.toThrow(
      new RegExp(`Could not list the active executions of "${WF}" .*Service Unavailable`)
    );
    expect(cancels(fetch)).toHaveLength(0);
  });
});

describe('enableFloorWorker enable-time run', () => {
  it('cancels the enable-time scheduled run before returning', async () => {
    let listings = 0;
    const fetch = fetchWith((path, o) => {
      if (o?.method === 'PATCH') return {};
      if (path.endsWith('/executions/cancel')) return {};
      if (path.includes('/executions')) {
        listings += 1;
        return { results: listings === 1 ? [{ id: 'tick-1' }] : [] };
      }
      return { workers: [{ id: FLOOR_WORKER_ID, enabled: true, workflowId: 'wf-1' }] };
    });
    await enableFloorWorker({
      fetch: fetch as unknown as HttpHandler,
      log,
      serviceAccountId: 'sa-1',
    });
    const order = fetch.mock.calls.map(([path, o]) =>
      path.endsWith('/executions/cancel') ? 'cancel' : o?.method
    );
    expect(order.indexOf('PATCH')).toBeLessThan(order.indexOf('cancel'));
    expect(order).toContain('cancel');
  });
});
