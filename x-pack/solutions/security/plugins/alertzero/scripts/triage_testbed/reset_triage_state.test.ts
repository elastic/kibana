/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

import { execFileSync } from 'child_process';
import { parseArgs, main } from './reset_triage_state';

const reply = (body: object, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface TestExecution {
  id: string;
  status: string;
  stubborn?: boolean;
}

interface TestState {
  cluster: string;
  alerts: number;
  executions: TestExecution[];
}

const execFileSyncMock = jest.mocked(execFileSync);

const ES = 'http://es';
const KIBANA = 'http://kb';
const TERMINAL = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

describe('reset_triage_state parseArgs', () => {
  const full = ['node', 'reset.js', '--data', 'd', '--es', ES, '--expect-cluster', 'c'];

  it('needs the data, the Elasticsearch and the cluster name it must have', () => {
    expect(parseArgs(full)).toMatchObject({ data: 'd', es: ES, expectCluster: 'c', dryRun: false });
    expect(() => parseArgs(full.slice(0, -2))).toThrow(/--expect-cluster is required/);
  });

  it('has defaults for Kibana and the alert index, and a dry-run switch', () => {
    expect(parseArgs([...full, '--dry-run'])).toMatchObject({
      kibana: 'http://localhost:5601',
      index: '.alerts-security.alerts-default',
      dryRun: true,
    });
  });
});

describe('reset_triage_state main', () => {
  const originalArgv = process.argv;
  let state: TestState;
  let calls: string[];
  let stdoutSpy: jest.SpiedFunction<typeof process.stdout.write>;

  // A small stand-in for Elasticsearch and Kibana. `stubborn` executions cannot be cancelled.
  const router = async (input: Parameters<typeof fetch>[0], init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    const body = init.body ? (JSON.parse(String(init.body)) as { size: number }) : undefined;
    calls.push(`${method} ${url}`);
    const open = (): TestExecution[] =>
      state.executions.filter((e) => !TERMINAL.includes(e.status));
    if (url === `${ES}/`) return reply({ cluster_name: state.cluster });
    if (url === `${ES}/.workflows-executions/_search`) {
      const hits = open().slice(0, body?.size);
      return reply({
        hits: {
          total: { value: open().length },
          hits: hits.map((e) => ({ _source: { id: e.id } })),
        },
      });
    }
    if (url === `${ES}/.workflows-executions/_count`) return reply({ count: open().length });
    if (url.startsWith(`${KIBANA}/api/workflows/executions/`) && method === 'POST') {
      const id = url.split('/').slice(-2)[0];
      const execution = state.executions.find((e) => e.id === id);
      if (execution && !execution.stubborn) execution.status = 'cancelled';
      return reply({});
    }
    if (url.includes('_delete_by_query')) {
      if (url.includes('alerts')) state.alerts = 0;
      return reply({});
    }
    if (url === `${ES}/.alerts-security.alerts-default/_count` && method === 'GET') {
      return reply({ count: state.alerts });
    }
    if (url === `${KIBANA}/api/agent_builder/conversations`) return reply({ results: [] });
    if (url.endsWith('/_count') && method === 'GET') return reply({ count: 0 });
    if (url.endsWith('/_count') && method === 'POST') return reply({ count: 0 });
    if (url.endsWith('/_search')) return reply({ hits: { hits: [] } });
    return reply({});
  };

  // The script waits 3 s between rounds. Run it on fake time, so that a test does not wait for real.
  const runOnFakeTime = async (promise: Promise<void>): Promise<void> => {
    let finished = false;
    const settled = promise.then(
      () => {
        finished = true;
      },
      () => {
        finished = true;
      }
    );
    while (!finished) {
      await jest.advanceTimersByTimeAsync(3000);
    }
    await settled;
    return promise;
  };

  const run = (...extra: string[]): Promise<void> => {
    process.argv = [
      'node',
      'reset.js',
      '--data',
      '/data',
      '--es',
      ES,
      '--kibana',
      KIBANA,
      '--expect-cluster',
      'elasticsearch',
      ...extra,
    ];
    return main();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    state = { cluster: 'elasticsearch', alerts: 5, executions: [] };
    calls = [];
    execFileSyncMock.mockClear();
    jest.spyOn(global, 'fetch').mockImplementation(router);
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.useRealTimers();
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  const execution = (
    id: string,
    status = 'waiting_for_input',
    extra: Partial<TestExecution> = {}
  ): TestExecution => ({ id, status, ...extra });

  it('refuses to write when the cluster is not the expected one', async () => {
    state.cluster = 'someone-elses';

    await expect(runOnFakeTime(run())).rejects.toThrow(/refusing to run/);
    expect(calls.filter((c) => c.startsWith('DELETE') || c.includes('_delete_by_query'))).toEqual(
      []
    );
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('changes nothing in a dry run, and still reports what it would change', async () => {
    state.executions = [execution('e1'), execution('e2')];

    await runOnFakeTime(run('--dry-run'));

    expect(calls.filter((c) => c.includes('/cancel') || c.includes('_delete_by_query'))).toEqual(
      []
    );
    expect(execFileSyncMock).not.toHaveBeenCalled();
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0]))).toMatchObject({
      dryRun: true,
      unfinishedExecutions: 2,
    });
  });

  it('cancels every unfinished execution, also when there are more than one search returns (500), and then writes the data again', async () => {
    state.executions = Array.from({ length: 1200 }, (_, i) => execution(`e${i}`));

    await runOnFakeTime(run());

    expect(state.executions.filter((e) => e.status !== 'cancelled')).toHaveLength(0);
    expect(calls.filter((c) => c.includes('/cancel'))).toHaveLength(1200);
    expect(execFileSyncMock).toHaveBeenCalledTimes(1);
    const [, replayArgs] = execFileSyncMock.mock.calls[0];
    expect(replayArgs).toEqual(expect.arrayContaining(['--backfill', '--slice-hours', '24']));
    // It must start the launcher of the replayer: the TypeScript file cannot run on its own with `node`.
    expect(replayArgs?.[0]).toMatch(/replay_alerts_cli\.js$/);
  });

  it('empties the alert index before it writes the day again, so that the old alerts are gone when the new ones arrive', async () => {
    let emptiedBeforeReplay: boolean | null = null;
    execFileSyncMock.mockImplementationOnce(() => {
      emptiedBeforeReplay = calls.some(
        (c) => c.includes('alerts') && c.includes('_delete_by_query')
      );
      return Buffer.from('');
    });

    await runOnFakeTime(run());

    expect(execFileSyncMock).toHaveBeenCalledTimes(1);
    expect(emptiedBeforeReplay).toBe(true);
  });

  it('fails loud when an execution cannot be cancelled, instead of reporting a clean state', async () => {
    state.executions = [execution('e1', 'waiting_for_input', { stubborn: true }), execution('e2')];

    await expect(runOnFakeTime(run())).rejects.toThrow(
      /not clean after the reset.*unfinishedExecutions/
    );
    // It gave up after a bounded number of rounds and did not loop for ever.
    expect(calls.filter((c) => c.endsWith('/executions/e1/cancel'))).toHaveLength(20);
    expect(calls.filter((c) => c.endsWith('/executions/e2/cancel'))).toHaveLength(1);
  });

  it('does not cancel executions that are already finished', async () => {
    state.executions = [execution('done', 'completed')];

    await runOnFakeTime(run());

    expect(calls.filter((c) => c.includes('/cancel'))).toEqual([]);
  });
});
