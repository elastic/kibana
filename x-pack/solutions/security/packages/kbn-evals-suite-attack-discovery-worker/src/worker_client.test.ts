/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { parse } from 'yaml';
import { FLOOR_IDLE_WAIT_MS, FLOOR_TICK_POLL_INTERVAL_MS, RUNNER_WORKFLOW_ID } from './constants';
import { AttackDiscoveryWorkerClient, describeFloorDrift, usingClient } from './worker_client';

const log = { info: jest.fn(), warning: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

const RUNNER = 'system-security-attack-discovery-worker';

const clientReturning = (
  execution: Record<string, unknown>,
  children: Array<{ workflowId: string; executionId: string }> = [
    { workflowId: RUNNER, executionId: 'run-1' },
  ]
) =>
  new AttackDiscoveryWorkerClient(
    jest.fn(async (path: string) => {
      if (path.includes('/workflow/')) return { workflowExecutionId: 'floor-1' };
      if (path.endsWith('/children')) return children;
      return execution;
    }) as unknown as HttpHandler,
    log
  );

describe('AttackDiscoveryWorkerClient timeouts', () => {
  it('reports the wait when an execution does not settle in time', async () => {
    const client = clientReturning({ id: 'run-1', status: 'running', stepExecutions: [] });
    const polled = await client.poll({ spaceId: 's', executionId: 'run-1', maxWaitMs: 0 });
    expect(polled.timedOutAfterMs).toBe(0);
    expect(polled.execution.status).toBe('running');
  });

  it('does not flag a settled execution as timed out', async () => {
    const client = clientReturning({ id: 'run-1', status: 'completed', stepExecutions: [] });
    const polled = await client.poll({ spaceId: 's', executionId: 'run-1', maxWaitMs: 0 });
    expect(polled.timedOutAfterMs).toBeUndefined();
  });

  it('returns a zero-step runner execution instead of throwing', async () => {
    const client = clientReturning({ id: 'run-1', status: 'failed', stepExecutions: [] });
    const polled = await client.run({ spaceId: 's', floorWorkflowId: 'floor' });
    expect(polled.execution.stepExecutions).toHaveLength(0);
  });

  it('falls back to the floor execution when the worker ends without starting a runner', async () => {
    const client = clientReturning({ id: 'floor-1', status: 'failed', stepExecutions: [] }, []);
    const polled = await client.run({ spaceId: 's', floorWorkflowId: 'floor' });
    expect(polled.execution.id).toBe('floor-1');
    expect(log.warning).toHaveBeenCalled();
  });

  it('names the concurrency cancel when the worker was cancelled before it dispatched a runner', async () => {
    (log.warning as jest.Mock).mockClear();
    const client = clientReturning({ id: 'floor-1', status: 'cancelled', stepExecutions: [] }, []);
    const polled = await client.run({ spaceId: 's', floorWorkflowId: 'floor' });
    expect(polled.execution.status).toBe('cancelled');
    expect(log.warning).toHaveBeenCalledWith(
      expect.stringMatching(/cancelled before it dispatched a runner.*concurrency/)
    );
  });

  it('does not blame concurrency when the worker failed without a runner', async () => {
    (log.warning as jest.Mock).mockClear();
    const client = clientReturning({ id: 'floor-1', status: 'failed', stepExecutions: [] }, []);
    await client.run({ spaceId: 's', floorWorkflowId: 'floor' });
    expect(log.warning).not.toHaveBeenCalledWith(expect.stringMatching(/concurrency/));
  });

  it('tracks both executions until the runner settles, then forgets them', async () => {
    const fetch = jest.fn(async (path: string) => {
      if (path.includes('/workflow/')) return { workflowExecutionId: 'floor-1' };
      if (path.endsWith('/children')) return [{ workflowId: RUNNER, executionId: 'run-1' }];
      if (path.includes('/cancel')) return {};
      return { id: 'run-1', status: 'completed', stepExecutions: [] };
    });
    const client = new AttackDiscoveryWorkerClient(fetch as unknown as HttpHandler, log);
    await client.run({ spaceId: 's', floorWorkflowId: 'floor' });
    await client.cancelPending();
    expect(fetch.mock.calls.some(([path]) => String(path).includes('/cancel'))).toBe(false);
  });
});

const FLOOR_YAML = `settings:
  run_as: "kibana/alertzero_attack_discovery"
steps:
  - name: run_attack_discovery
    type: workflow.execute
    with:
      workflow-id: system-security-attack-discovery-worker
      run-as-mode: inherit
      inputs:
        autonomy: manual
`;

/** A Kibana that stores the floor workflow and records every call, with a review child. */
const fakeKibana = ({
  childStatus = 'completed',
  putFailsOn,
  storeOnPut,
  editOnRun,
  disableOnRun = false,
  failFloorReadAfterPut,
  failListing = false,
  active = {},
  floorBusyListings = 0,
  floorRunningReads = 0,
  floorReadFails = false,
  children = [{ workflowId: 'system-security-attack-discovery-review', executionId: 'review-9' }],
  initialYaml = FLOOR_YAML,
  floorStatus = 'failed',
}: {
  childStatus?: string;
  putFailsOn?: number;
  /** What the server stores for the nth PUT, when it is not the body as sent (a drifting server). */
  storeOnPut?: (putNumber: number, yaml: string) => string;
  /** A write by someone else that lands while the floor runs (stored text, as the server keeps it). */
  editOnRun?: (yaml: string) => string;
  /** The floor is disabled by someone else while it runs (`enabled` is not part of the YAML). */
  disableOnRun?: boolean;
  /** The first GET of the floor after the nth PUT fails (the read-back after the rewrite). */
  failFloorReadAfterPut?: number;
  /** Every executions listing fails. */
  failListing?: boolean;
  /** Ids of active executions per workflow id (the executions listing). */
  active?: Record<string, string[]>;
  /** The floor's listing reports `floor-busy` for this many listings, then idle (a resume pending). */
  floorBusyListings?: number;
  /** The floor execution reads `running` this many times before its `floorStatus` (resume pending). */
  floorRunningReads?: number;
  /** Reading the floor execution (`floor-1`) fails, as a transient API error would. */
  floorReadFails?: boolean;
  children?: Array<{ workflowId: string; executionId: string }>;
  initialYaml?: string;
  floorStatus?: string;
} = {}) => {
  let yaml = initialYaml;
  let puts = 0;
  // The server's revision counter. It moves only when the trimmed YAML text changes
  // (`applyWorkflowVersion` in workflows_management), so a same-text write leaves it alone.
  let version = 1;
  let enabled = true;
  let floorReadFailed = false;
  let floorListings = 0;
  let floorReads = 0;
  const store = (next: string) => {
    if (next.trim() !== yaml.trim()) version += 1;
    yaml = next;
  };
  const cancelled = new Set<string>();
  const calls: Array<{ method: string; path: string; body?: string }> = [];
  const workflow = () => {
    return {
      yaml,
      definition: parse(yaml),
      enabled,
      definitionHash: 'hash',
      // Held constant in this fake: the managed counter is not what these tests exercise.
      managedVersion: 9,
      originManagedWorkflowId: 'system-security-floor-attack-discovery',
      version,
    };
  };
  const fetch = jest.fn(async (path: string, init?: { method?: string; body?: string }) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, path, body: init?.body });
    if (method === 'PUT') {
      puts += 1;
      if (puts === putFailsOn) throw Object.assign(new Error('boom'), { status: 500 });
      const sent = JSON.parse(init?.body ?? '{}').yaml as string;
      store(storeOnPut ? storeOnPut(puts, sent) : sent);
      // The managed route answers with the updated workflow's metadata, not its definition.
      return { id: 'floor', enabled: true, valid: true, validationErrors: [] };
    }
    const listed = /workflow\/([^/]+)\/executions$/.exec(path)?.[1];
    if (listed && failListing) throw Object.assign(new Error('listing down'), { status: 503 });
    if (listed === 'floor' && ++floorListings <= floorBusyListings) {
      return { results: [{ id: 'floor-busy' }] };
    }
    if (listed) return { results: (active[listed] ?? []).map((id) => ({ id })) };
    if (path.endsWith('/run')) {
      if (editOnRun) store(editOnRun(yaml));
      if (disableOnRun) enabled = false;
      return { workflowExecutionId: 'floor-1' };
    }
    if (path.endsWith('/children')) return children;
    if (path.endsWith('/cancel')) {
      cancelled.add(/executions\/([^/]+)\/cancel/.exec(path)?.[1] ?? '');
      return {};
    }
    const execution = /executions\/([^/]+)$/.exec(path)?.[1];
    if (execution === 'review-9') {
      return {
        id: 'review-9',
        status: cancelled.has('review-9') ? 'cancelled' : childStatus,
        stepExecutions: [],
      };
    }
    if (execution === 'floor-1') {
      if (floorReadFails) throw Object.assign(new Error('floor read down'), { status: 502 });
      return {
        id: 'floor-1',
        status: cancelled.has('floor-1')
          ? 'cancelled'
          : ++floorReads <= floorRunningReads
          ? 'running'
          : floorStatus,
        stepExecutions: [],
      };
    }
    if (failFloorReadAfterPut !== undefined && puts >= failFloorReadAfterPut && !floorReadFailed) {
      floorReadFailed = true;
      throw Object.assign(new Error('read-back failed'), { status: 502 });
    }
    return workflow();
  });
  return {
    fetch,
    calls,
    storedYaml: () => yaml,
    edit: store,
    disable: () => {
      enabled = false;
    },
    cancelled,
  };
};

const FLOOR_PATH = '/s/s/api/workflows/workflow/floor';
const MANAGED_PATH = '/s/s/api/workflows/managed/workflow/floor';

describe('AttackDiscoveryWorkerClient.runReview', () => {
  const review = (client: AttackDiscoveryWorkerClient, maxWaitMs = 0) =>
    client.runReview({
      spaceId: 's',
      floorWorkflowId: 'floor',
      attackDiscoveryId: 'a'.repeat(64),
      title: 'Encoded PowerShell command-and-control on WS-MGMT-201',
      maxWaitMs,
    });

  it('runs the review as a child of the floor with the rewritten YAML, then restores it', async () => {
    const kibana = fakeKibana();
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    const polled = await review(client);
    expect(polled.execution.id).toBe('review-9');
    expect(polled.timedOutAfterMs).toBeUndefined();

    const puts = kibana.calls.filter(({ method }) => method === 'PUT');
    expect(puts.map(({ path }) => path)).toEqual([MANAGED_PATH, MANAGED_PATH]);
    const edited = parse(JSON.parse(puts[0].body ?? '{}').yaml);
    expect(edited.settings.run_as).toBe('kibana/alertzero_attack_discovery');
    expect(edited.steps[0].with).toEqual({
      'workflow-id': 'system-security-attack-discovery-review',
      'run-as-mode': 'inherit',
      inputs: {
        attack_discovery_id: 'a'.repeat(64),
        title: 'Encoded PowerShell command-and-control on WS-MGMT-201',
      },
    });
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
    // The run started from the floor, never from the review's own run route.
    expect(kibana.calls.some(({ path }) => path.includes('attack-discovery-review/run'))).toBe(
      false
    );
    expect(kibana.calls.filter(({ path }) => path === `${FLOOR_PATH}/run`)).toHaveLength(1);
    // Both executions had ended, so there was nothing to cancel, now or at teardown.
    await client.cancelPending();
    expect(kibana.calls.some(({ path }) => path.endsWith('/cancel'))).toBe(false);
  });

  it('cancels the floor and the review before it puts the YAML back', async () => {
    const kibana = fakeKibana({ childStatus: 'running', floorStatus: 'running' });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    const polled = await review(client);
    expect(polled.timedOutAfterMs).toBe(0);
    expect([...kibana.cancelled].sort()).toEqual(['floor-1', 'review-9']);
    const lastCancel = kibana.calls.map(({ path }) => path.endsWith('/cancel')).lastIndexOf(true);
    const restore = kibana.calls.map(({ method }) => method === 'PUT').lastIndexOf(true);
    expect(lastCancel).toBeGreaterThan(-1);
    expect(lastCancel).toBeLessThan(restore);
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
    // Already cancelled, so teardown has nothing left to cancel.
    const cancelsBefore = kibana.calls.filter(({ path }) => path.endsWith('/cancel')).length;
    await client.cancelPending();
    expect(kibana.calls.filter(({ path }) => path.endsWith('/cancel'))).toHaveLength(cancelsBefore);
  });

  it('returns the floor execution and restores the YAML when the review never starts', async () => {
    const kibana = fakeKibana({ children: [] });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    const polled = await review(client);
    expect(polled.execution.id).toBe('floor-1');
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
  });

  it('restores the YAML when the run fails, and surfaces the run error', async () => {
    const kibana = fakeKibana();
    const failing = jest.fn(async (path: string, init?: { method?: string; body?: string }) => {
      if (path.endsWith('/run')) throw Object.assign(new Error('run refused'), { status: 409 });
      return kibana.fetch(path, init);
    });
    const client = new AttackDiscoveryWorkerClient(failing as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(/run refused/);
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
  });

  it('does not run anything when the rewrite PUT fails, and still restores', async () => {
    const kibana = fakeKibana({ putFailsOn: 1 });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(/boom/);
    expect(kibana.calls.some(({ path }) => path === `${FLOOR_PATH}/run`)).toBe(false);
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
  });

  it('throws when the restored definition differs from the one read before the run', async () => {
    // The server keeps a different definition than the one the restore sent.
    const kibana = fakeKibana({
      storeOnPut: (putNumber, sent) => (putNumber === 2 ? sent.replace('manual', 'auto') : sent),
    });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(
      /differs from before the run after the restore \(definition\)/
    );
  });

  it('does not restore over a floor that someone else edited during the run', async () => {
    const edited = FLOOR_YAML.replace('manual', 'edited-by-someone-else');
    const kibana = fakeKibana({ editOnRun: () => edited });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(
      /floor changed concurrently during the floor-parent run; not restored/
    );
    // Only the rewrite PUT happened: the edit is left as the other writer made it.
    expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(1);
    expect(kibana.storedYaml()).toBe(edited);
  });

  it('does not restore when the floor was disabled during the run', async () => {
    const kibana = fakeKibana({ disableOnRun: true });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(/floor changed concurrently.*enabled/);
    expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(1);
  });

  it('restores over a floor whose text did not change, since the version did not move either', async () => {
    const kibana = fakeKibana({ editOnRun: (yaml) => `${yaml}\n` });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).resolves.toBeDefined();
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
  });

  it('restores after a failed read-back when the stored text is still the rewrite', async () => {
    const kibana = fakeKibana({ failFloorReadAfterPut: 1 });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    // The read-back failure is the run's error; the restore is verified by text, not blind.
    await expect(review(client)).rejects.toThrow(/read-back failed/);
    expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(2);
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
  });

  it('does not restore blind when the read-back failed and the floor was edited since', async () => {
    const edited = FLOOR_YAML.replace('manual', 'edited-by-someone-else');
    const kibana = fakeKibana({ failFloorReadAfterPut: 1 });
    let reads = 0;
    const failing = jest.fn(async (path: string, init?: { method?: string; body?: string }) => {
      // Someone else writes right as the read-back fails; the run never gets as far as its own route.
      if (path === FLOOR_PATH && init?.method === 'GET' && ++reads === 2) kibana.edit(edited);
      return kibana.fetch(path, init);
    });
    const client = new AttackDiscoveryWorkerClient(failing as unknown as HttpHandler, log);
    const error = await review(client).then(
      () => undefined,
      (thrown: unknown) => thrown
    );
    expect((error as AggregateError).message).toMatch(/read-back failed/);
    expect((error as AggregateError).message).toMatch(/floor changed concurrently/);
    expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(1);
  });

  it('does not restore blind when the read-back failed and the floor was disabled since', async () => {
    const kibana = fakeKibana({ failFloorReadAfterPut: 1 });
    let reads = 0;
    const failing = jest.fn(async (path: string, init?: { method?: string; body?: string }) => {
      if (path === FLOOR_PATH && init?.method === 'GET' && ++reads === 2) kibana.disable();
      return kibana.fetch(path, init);
    });
    const client = new AttackDiscoveryWorkerClient(failing as unknown as HttpHandler, log);
    const error = await review(client).then(
      () => undefined,
      (thrown: unknown) => thrown
    );
    expect((error as AggregateError).message).toMatch(/read-back failed/);
    expect((error as AggregateError).message).toMatch(/floor changed concurrently.*enabled/);
    expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(1);
  });

  it('rejects, without a PUT, when the active-execution listing fails', async () => {
    const kibana = fakeKibana({ failListing: true });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(/Could not list the active executions/);
    expect(kibana.calls.some(({ method }) => method === 'PUT')).toBe(false);
  });

  it('restores the floor when the review itself times out', async () => {
    const kibana = fakeKibana({ childStatus: 'running', floorStatus: 'running' });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    const polled = await review(client, 0);
    expect(polled.timedOutAfterMs).toBe(0);
    expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(2);
    expect(kibana.storedYaml()).toBe(FLOOR_YAML);
  });

  describe('after the child ends while the floor parent is still resuming', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });
      (log.warning as jest.Mock).mockClear();
    });
    afterEach(() => jest.useRealTimers());

    const runRunner = (kibana: ReturnType<typeof fakeKibana>) => {
      const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
      const result = client.run({ spaceId: 's', floorWorkflowId: 'floor' }).then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
      );
      return { client, result };
    };
    const runnerChild = [{ workflowId: RUNNER_WORKFLOW_ID, executionId: 'review-9' }];

    it('returns only once the floor execution is terminal', async () => {
      const kibana = fakeKibana({ floorRunningReads: 3 });
      const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
      const result = review(client).then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
      );
      await jest.advanceTimersByTimeAsync(60_000);
      expect(await result).toHaveProperty('value');
      const floorReads = kibana.calls.filter(({ path }) => path.endsWith('/executions/floor-1'));
      expect(floorReads.length).toBeGreaterThan(3);
      expect(kibana.cancelled.size).toBe(0);
    });

    it('warns, returns the runner and leaves only the floor to cancel when it does not settle', async () => {
      const kibana = fakeKibana({
        children: runnerChild,
        floorRunningReads: Number.MAX_SAFE_INTEGER,
      });
      const { client, result } = runRunner(kibana);
      await jest.advanceTimersByTimeAsync(FLOOR_IDLE_WAIT_MS + 60_000);
      const outcome = await result;
      expect(outcome).toHaveProperty('value.execution.id', 'review-9');
      expect(log.warning).toHaveBeenCalledWith(
        expect.stringMatching(/Execution floor-1 did not settle/)
      );
      await client.cancelPending();
      expect(
        kibana.calls.filter(({ path }) => path.endsWith('/cancel')).map(({ path }) => path)
      ).toEqual([expect.stringContaining('/executions/floor-1/cancel')]);
    });

    it('still returns the finished child when reading the floor execution fails', async () => {
      const kibana = fakeKibana({ children: runnerChild, floorReadFails: true });
      const { result } = runRunner(kibana);
      await jest.advanceTimersByTimeAsync(60_000);
      const outcome = await result;
      expect(outcome).toHaveProperty('value.execution.id', 'review-9');
      expect(log.warning).toHaveBeenCalledWith(
        expect.stringMatching(
          /Could not read floor execution floor-1 after its child ended: floor read down/
        )
      );
    });
  });

  describe('while the floor is still resuming after an earlier run', () => {
    beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick'] }));
    afterEach(() => jest.useRealTimers());

    const listingsOf = (kibana: ReturnType<typeof fakeKibana>, workflowId: string) =>
      kibana.calls.filter(({ path }) => path.endsWith(`/workflow/${workflowId}/executions`));

    it('waits for the floor to go idle, then rewrites and runs', async () => {
      const kibana = fakeKibana({ floorBusyListings: 3 });
      const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
      const outcome = review(client).then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
      );
      await jest.advanceTimersByTimeAsync(60_000);
      expect(await outcome).toHaveProperty('value');
      expect(listingsOf(kibana, 'floor').length).toBeGreaterThan(3);
      expect(kibana.calls.filter(({ method }) => method === 'PUT')).toHaveLength(2);
      expect(kibana.cancelled.size).toBe(0);
      expect(kibana.storedYaml()).toBe(FLOOR_YAML);
    });

    it.each([
      ['the floor', 'floor'],
      ['the review', 'system-security-attack-discovery-review'],
    ])(
      'keeps polling %s until the wait is over, then throws the busy error and changes nothing',
      async (_label, workflowId) => {
        const kibana = fakeKibana({ active: { [workflowId]: ['busy-1'] } });
        const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
        let settled = false;
        const outcome = review(client).then(
          () => {
            settled = true;
            return undefined;
          },
          (thrown: unknown) => {
            settled = true;
            return thrown;
          }
        );
        await jest.advanceTimersByTimeAsync(FLOOR_IDLE_WAIT_MS - FLOOR_TICK_POLL_INTERVAL_MS);
        expect(settled).toBe(false);
        expect(listingsOf(kibana, workflowId).length).toBeGreaterThan(1);
        await jest.advanceTimersByTimeAsync(2 * FLOOR_TICK_POLL_INTERVAL_MS);
        expect(String(await outcome)).toMatch(
          new RegExp(`"${workflowId}" has active executions \\(busy-1\\)`)
        );
        expect(kibana.calls.some(({ method }) => method === 'PUT')).toBe(false);
        expect(kibana.calls.some(({ path }) => path.endsWith('/run'))).toBe(false);
        expect(kibana.cancelled.size).toBe(0);
      }
    );
  });

  it('throws naming the floor when the restore PUT fails', async () => {
    const kibana = fakeKibana({ putFailsOn: 2 });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(/Could not restore floor workflow "floor"/);
  });

  it('throws one AggregateError naming the run, cancel and restore failures', async () => {
    const kibana = fakeKibana({ childStatus: 'running', floorStatus: 'running', putFailsOn: 2 });
    const failing = jest.fn(async (path: string, init?: { method?: string; body?: string }) => {
      if (path.endsWith('/cancel'))
        throw Object.assign(new Error('cancel refused'), { status: 500 });
      if (path.endsWith('/children')) throw new Error('children unavailable');
      return kibana.fetch(path, init);
    });
    const client = new AttackDiscoveryWorkerClient(failing as unknown as HttpHandler, log);
    const error = await review(client).then(
      () => undefined,
      (thrown: unknown) => thrown
    );
    expect(error).toBeInstanceOf(AggregateError);
    const { errors, message } = error as AggregateError;
    expect(errors).toHaveLength(3);
    expect(message).toMatch(/children unavailable/);
    expect(message).toMatch(/cancel refused/);
    expect(message).toMatch(/Could not restore floor workflow "floor"/);
  });

  it('refuses a floor that an interrupted run left rewritten, before any PUT', async () => {
    const leftover = FLOOR_YAML.replace(
      'system-security-attack-discovery-worker',
      'system-security-attack-discovery-review'
    );
    const kibana = fakeKibana({ initialYaml: leftover });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(
      /does not dispatch "system-security-attack-discovery-worker".*interrupted/
    );
    expect(kibana.calls.some(({ method }) => method === 'PUT')).toBe(false);
    expect(kibana.calls.some(({ path }) => path.endsWith('/run'))).toBe(false);
  });

  it('refuses a floor without run_as before changing anything', async () => {
    const kibana = fakeKibana({ initialYaml: FLOOR_YAML.replace(/settings:\n.*\n/, '') });
    const client = new AttackDiscoveryWorkerClient(kibana.fetch as unknown as HttpHandler, log);
    await expect(review(client)).rejects.toThrow(/run_as/);
    expect(kibana.calls.some(({ method }) => method === 'PUT')).toBe(false);
  });
});

describe('one deadline for finding the child and polling it', () => {
  it('does not give the poll a second full wait after the child lookup used the first', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    try {
      const kibana = fakeKibana({
        childStatus: 'running',
        floorStatus: 'running',
        children: [],
      });
      // The review child appears only after 12s of lookup; the budget is 15s in all.
      const started = Date.now();
      const fetchWithLateChild = jest.fn(
        async (path: string, init?: { method?: string; body?: string }) => {
          if (path.endsWith('/children') && Date.now() - started >= 12_000) {
            return [
              { workflowId: 'system-security-attack-discovery-review', executionId: 'review-9' },
            ];
          }
          return kibana.fetch(path, init);
        }
      );
      const client = new AttackDiscoveryWorkerClient(
        fetchWithLateChild as unknown as HttpHandler,
        log
      );
      const result = client.runReview({
        spaceId: 's',
        floorWorkflowId: 'floor',
        attackDiscoveryId: 'a'.repeat(64),
        title: 't',
        maxWaitMs: 15_000,
      });
      await jest.advanceTimersByTimeAsync(60_000);
      const polled = await result;
      expect(polled.execution.id).toBe('review-9');
      expect(polled.timedOutAfterMs).toBe(15_000);
      // Time spent on the call, cancel wait excluded, stays within one budget (+ poll granularity).
      const pollsOfChild = kibana.calls.filter(({ path }) =>
        path.endsWith('/executions/review-9')
      ).length;
      expect(pollsOfChild).toBeLessThan(6);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('describeFloorDrift', () => {
  const state = {
    yaml: 'a',
    definition: { steps: [{ a: 1 }] },
    enabled: true,
    definitionHash: 'h',
    managedVersion: 9,
    originManagedWorkflowId: 'o',
  };

  it('is undefined when only the YAML text differs', () => {
    expect(describeFloorDrift(state, { ...state, yaml: 'b' })).toBeUndefined();
  });

  it('names every field that differs', () => {
    expect(
      describeFloorDrift(state, {
        ...state,
        definition: { steps: [] },
        enabled: false,
        definitionHash: 'x',
        managedVersion: 10,
        originManagedWorkflowId: 'p',
      })
    ).toMatch(/\(definition, enabled, definitionHash, managedVersion, originManagedWorkflowId\)/);
  });
});

const cancelFailing = (failing: Record<string, number>) => {
  const cancelled: string[] = [];
  const fetch = jest.fn(async (path: string) => {
    const id = /executions\/([^/]+)\/cancel/.exec(path)?.[1] ?? '';
    cancelled.push(id);
    if (failing[id])
      throw Object.assign(new Error(`status ${failing[id]}`), { status: failing[id] });
    return {};
  });
  const client = new AttackDiscoveryWorkerClient(fetch as unknown as HttpHandler, log);
  ['a', 'b', 'c'].forEach((id) => client.track('s', id));
  return { client, cancelled };
};

describe('AttackDiscoveryWorkerClient.cancelPending', () => {
  it('rejects naming the execution and status, after cancelling every other one', async () => {
    const { client, cancelled } = cancelFailing({ b: 500 });
    await expect(client.cancelPending()).rejects.toThrow(
      /Could not cancel execution b \(HTTP 500\)/
    );
    expect(cancelled.sort()).toEqual(['a', 'b', 'c']);
  });

  it('keeps an execution whose cancel failed pending, so the next call retries only it', async () => {
    const failing: Record<string, number> = { b: 500 };
    const { client, cancelled } = cancelFailing(failing);
    await expect(client.cancelPending()).rejects.toThrow(
      /Could not cancel execution b \(HTTP 500\)/
    );
    cancelled.length = 0;
    delete failing.b;
    await expect(client.cancelPending()).resolves.toBeUndefined();
    expect(cancelled).toEqual(['b']);
    cancelled.length = 0;
    await client.cancelPending();
    expect(cancelled).toEqual([]);
  });

  it('retries a failed cancel once, then drops it with a warning naming the execution', async () => {
    const { client, cancelled } = cancelFailing({ b: 500 });
    await expect(client.cancelPending()).rejects.toThrow(/Could not cancel execution b/);
    cancelled.length = 0;
    (log.warning as jest.Mock).mockClear();
    await expect(client.cancelPending()).rejects.toThrow(/Could not cancel execution b/);
    expect(cancelled).toEqual(['b']);
    expect((log.warning as jest.Mock).mock.calls.map(([message]) => message)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Giving up on cancelling execution b.*status 500/),
      ])
    );
    cancelled.length = 0;
    await expect(client.cancelPending()).resolves.toBeUndefined();
    expect(cancelled).toEqual([]);
  });

  it('counts a failed cancel afresh once the execution was forgotten and tracked again', async () => {
    let cancelFails = true;
    const fetch = jest.fn(async (path: string) => {
      if (path.includes('/workflow/')) return { workflowExecutionId: 'floor-1' };
      if (path.endsWith('/children')) return [{ workflowId: RUNNER, executionId: 'run-1' }];
      if (path.includes('/cancel')) {
        if (cancelFails) throw Object.assign(new Error('status 500'), { status: 500 });
        return {};
      }
      return { id: 'run-1', status: 'completed', stepExecutions: [] };
    });
    const client = new AttackDiscoveryWorkerClient(fetch as unknown as HttpHandler, log);
    client.track('s', 'run-1');
    await expect(client.cancelPending()).rejects.toThrow(/Could not cancel execution run-1/);
    await client.run({ spaceId: 's', floorWorkflowId: 'floor' });
    (log.warning as jest.Mock).mockClear();
    fetch.mockClear();
    await expect(client.cancelPending()).rejects.toThrow(/Could not cancel execution run-1/);
    expect((log.warning as jest.Mock).mock.calls.map(([message]) => message)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/Giving up/)])
    );
    cancelFails = false;
    fetch.mockClear();
    await expect(client.cancelPending()).resolves.toBeUndefined();
    expect(fetch.mock.calls.filter(([path]) => String(path).includes('/cancel'))).toHaveLength(1);
  });

  it('ignores a 404', async () => {
    const { client, cancelled } = cancelFailing({ b: 404 });
    await expect(client.cancelPending()).resolves.toBeUndefined();
    expect(cancelled.sort()).toEqual(['a', 'b', 'c']);
  });

  it('throws an AggregateError naming each failed execution', async () => {
    const { client } = cancelFailing({ a: 500, c: 503 });
    const error = await client.cancelPending().then(
      () => undefined,
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
    expect((error as Error).message).toMatch(/execution a \(HTTP 500\).*execution c \(HTTP 503\)/);
  });
});

describe('usingClient', () => {
  it('cancels pending executions after a normal run', async () => {
    const cancelPending = jest.fn(async () => undefined);
    await usingClient({ cancelPending }, async () => undefined);
    expect(cancelPending).toHaveBeenCalledTimes(1);
  });

  it('cancels pending executions when the body throws, and rethrows', async () => {
    const cancelPending = jest.fn(async () => undefined);
    await expect(
      usingClient({ cancelPending }, async () => {
        throw new Error('spec failed');
      })
    ).rejects.toThrow('spec failed');
    expect(cancelPending).toHaveBeenCalledTimes(1);
  });

  it('rejects with the cancel error when only the cancel fails', async () => {
    const cancelPending = jest.fn(async () => {
      throw new Error('cancel failed');
    });
    await expect(usingClient({ cancelPending }, async () => undefined)).rejects.toThrow(
      'cancel failed'
    );
  });

  it('reports both errors when the body and the cancel fail', async () => {
    const cancelPending = jest.fn(async () => {
      throw new Error('cancel failed');
    });
    const error = await usingClient({ cancelPending }, async () => {
      throw new Error('spec failed');
    }).then(
      () => undefined,
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as Error).message).toMatch(/spec failed.*cancel failed/);
  });
});
