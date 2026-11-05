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

beforeEach(() => {
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
const fetchWith = (handler: Handler) =>
  jest.fn(async (path: string, o?: CallOptions) => handler(path, o));

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
      const runnerListsCount = fetch.mock.calls.filter(([path]) =>
        path.includes(`/workflow/${RUNNER_WORKFLOW_ID}/executions`)
      ).length;
      expect(runnerListsCount).toBe(3);
    });

    it('fails when the runner never leaves its slot', async () => {
      const fetch = withRunner([['runner-1']]);
      await expect(settle(fetch, { cancelTimeoutMs: 0 })).rejects.toThrow(
        new RegExp(`"${RUNNER_WORKFLOW_ID}" is still active .* \\(runner-1\\); a row would race it`)
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
