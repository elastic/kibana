/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { HuntWatchClient, candidatesMatchBatch, isTerminal } from './hunt_client';

interface Req {
  path: string;
  method?: string;
  query?: Record<string, unknown>;
  body?: { report_ids: string[] };
}

const log = {
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
} as unknown as ToolingLog;

const coordinatorOutput = (hitId: string) => ({
  status: 'tier1_only',
  run_id: 'run',
  tier1: {
    status: 'environment_hits_found',
    hits: [{ id: hitId, index: 'logs-x', matched: { ioc: { value: 'evil.example' } } }],
  },
  completeness: 'complete',
});

/**
 * Fake server with the semantics the real routes have (verified against
 * get_child_workflow_executions.ts): `/children` returns summaries with NO
 * step output and NO context; the output only comes from
 * `/executions/{id}?includeOutput&includeInput`.
 */
const makeServer = ({
  sweepStatuses = ['completed'],
  children,
}: {
  sweepStatuses?: string[];
  children: Array<{ executionId: string; reportId: string; output?: unknown }>;
}) => {
  const requests: Req[] = [];
  let sweepPolls = 0;
  const request = jest.fn(async (req: Req) => {
    requests.push(req);
    if (req.path === '/internal/alertzero/hunt/candidates') {
      return { data: { ids: req.body?.report_ids ?? [], skipped: [] } };
    }
    if (req.path.endsWith('/run')) return { data: { workflowExecutionId: 'sweep-1' } };
    if (req.path === '/api/workflows/executions/sweep-1/children') {
      return {
        data: children.map((c) => ({
          workflowId: 'system-security-hunt-execute',
          executionId: c.executionId,
          status: 'completed',
          stepExecutions: [{ stepId: 'read_hunt_result' }], // no output: stripped server-side
        })),
      };
    }
    if (req.path === '/api/workflows/executions/sweep-1') {
      const status = sweepStatuses[Math.min(sweepPolls++, sweepStatuses.length - 1)];
      return { data: { status } };
    }
    const child = children.find((c) => req.path === `/api/workflows/executions/${c.executionId}`);
    if (child) {
      const full = req.query?.includeOutput === true && req.query?.includeInput === true;
      return {
        data: {
          status: 'completed',
          context: full ? { inputs: { reportId: child.reportId } } : undefined,
          // Real shape (current main): `run_hunt_coordinator` returns only the async run
          // envelope; the coordinator body arrives through the `read_hunt_result` step,
          // which runs once per poll iteration — earlier reads see `running`, and only
          // the completed read carries `data.result` (a child with no `output` models a
          // run whose read never completed).
          stepExecutions: [
            {
              stepId: 'run_hunt_coordinator',
              output: { run_id: 'run', state: 'running', result_attachment_id: 'att-1' },
            },
            { stepId: 'read_hunt_result', output: { data: { state: 'running' } } },
            ...(child.output === undefined
              ? []
              : [
                  {
                    stepId: 'read_hunt_result',
                    output: full
                      ? { data: { state: 'completed', result: child.output } }
                      : undefined,
                  },
                ]),
          ],
        },
      };
    }
    throw new Error(`unexpected request ${req.method} ${req.path}`);
  });
  const refresh = jest.fn(async (_p: { index: string }) => ({}));
  const client = new HuntWatchClient({ request } as unknown as KbnClient, log, {
    huntWorkerWorkflowId: 'worker-1',
    esClient: { indices: { refresh } },
    pollIntervalMs: 1,
    maxWaitMs: 50,
  });
  return { client, requests, refresh };
};

describe('HuntWatchClient.ingestThreatReport', () => {
  it('sends the document with nested objects, because the hunt reads _source nested', async () => {
    const request = jest.fn(async (_req: Record<string, unknown>) => ({
      data: { reportId: 'r1' },
    }));
    const client = new HuntWatchClient({ request } as unknown as KbnClient, log, {
      huntWorkerWorkflowId: 'worker-1',
      esClient: { indices: { refresh: jest.fn() } },
    });
    await client.ingestThreatReport({
      'content.body_text': 'text',
      'extracted.iocs': [{ type: 'domain', value: 'a.example' }],
    });
    expect(request.mock.calls[0][0].body).toEqual({
      document: {
        content: { body_text: 'text' },
        extracted: { iocs: [{ type: 'domain', value: 'a.example' }] },
      },
    });
  });
});

describe('isTerminal (B8)', () => {
  it.each(['completed', 'failed', 'cancelled', 'skipped', 'timed_out'])('%s is terminal', (s) => {
    expect(isTerminal(s)).toBe(true);
  });
  it.each(['running', 'pending', 'waiting', undefined, 'succeeded', 'finished'])(
    '%s is not',
    (s) => {
      expect(isTerminal(s)).toBe(false);
    }
  );
});

describe('HuntWatchClient.runHunts', () => {
  it('B1: reads each child via the execution route with includeInput/includeOutput and keys runs by reportId', async () => {
    const { client, requests } = makeServer({
      children: [
        { executionId: 'c1', reportId: 'rep-1', output: coordinatorOutput('d1') },
        { executionId: 'c2', reportId: 'rep-2', output: coordinatorOutput('d2') },
      ],
    });
    const { runs, invalidBatches } = await client.runHunts(['rep-1', 'rep-2']);
    expect(invalidBatches).toEqual([]);
    expect([...runs.keys()]).toEqual(['rep-1', 'rep-2']);
    expect(runs.get('rep-1')?.tier1_hits).toEqual([{ _id: 'd1', _index: 'logs-x' }]);
    const childReads = requests.filter((r) => /executions\/c[12]$/.test(r.path));
    expect(childReads).toHaveLength(2);
    for (const r of childReads)
      expect(r.query).toEqual({ includeInput: true, includeOutput: true });
  });

  it('B8: a sweep that reports `completed` is read immediately, not polled to the deadline', async () => {
    const { client } = makeServer({
      sweepStatuses: ['running', 'running', 'completed'],
      children: [{ executionId: 'c1', reportId: 'rep-1', output: coordinatorOutput('d1') }],
    });
    const started = Date.now();
    const { runs } = await client.runHunts(['rep-1']);
    expect(runs.size).toBe(1);
    expect(Date.now() - started).toBeLessThan(40);
  });

  it('B8: throws at the deadline when the sweep never terminates', async () => {
    const { client } = makeServer({ sweepStatuses: ['running'], children: [] });
    await expect(client.runHunts(['rep-1'])).rejects.toThrow(/did not reach a terminal status/);
  });

  it('B8: refreshes the reports index before the candidates call', async () => {
    const { client, requests, refresh } = makeServer({
      children: [{ executionId: 'c1', reportId: 'rep-1', output: coordinatorOutput('d1') }],
    });
    await client.runHunts(['rep-1']);
    expect(refresh).toHaveBeenCalledWith({ index: '.kibana-threat-reports' });
    const refreshOrder = refresh.mock.invocationCallOrder[0];
    expect(refreshOrder).toBeDefined();
    expect(requests[0].path).toBe('/internal/alertzero/hunt/candidates');
  });

  it('a child whose output is not a coordinator response is absent from runs (caller marks it INVALID)', async () => {
    const { client } = makeServer({
      children: [
        { executionId: 'c1', reportId: 'rep-1', output: { status: 'failed', error: 'boom' } },
        { executionId: 'c2', reportId: 'rep-2', output: coordinatorOutput('d2') },
      ],
    });
    const { runs } = await client.runHunts(['rep-1', 'rep-2']);
    expect([...runs.keys()]).toEqual(['rep-2']);
  });

  it('a child whose attachment read never completed (async run unfinished) is absent from runs', async () => {
    // Since the coordinator went async, a hunt can still be polling when the
    // sweep ends: no `read_hunt_result` step ever saw state `completed`, so
    // there is no coordinator body to read at all.
    const { client } = makeServer({
      children: [
        { executionId: 'c1', reportId: 'rep-1' },
        { executionId: 'c2', reportId: 'rep-2', output: coordinatorOutput('d2') },
      ],
    });
    const { runs } = await client.runHunts(['rep-1', 'rep-2']);
    expect([...runs.keys()]).toEqual(['rep-2']);
  });

  it('a candidates violation makes an invalid batch and never triggers the Worker', async () => {
    const requests: Req[] = [];
    const request = jest.fn(async (req: Req) => {
      requests.push(req);
      return { data: { ids: [], skipped: [{ id: 'rep-1', reason: 'not_found' }] } };
    });
    const client = new HuntWatchClient({ request } as unknown as KbnClient, log, {
      huntWorkerWorkflowId: 'worker-1',
      esClient: { indices: { refresh: async () => ({}) } },
    });
    const { runs, invalidBatches } = await client.runHunts(['rep-1']);
    expect(runs.size).toBe(0);
    expect(invalidBatches).toHaveLength(1);
    expect(invalidBatches[0].batch).toEqual(['rep-1']);
    expect(requests.some((r) => r.path.endsWith('/run'))).toBe(false);
  });

  it('batches at the route cap of 10 and serializes the sweeps', async () => {
    const ids = Array.from({ length: 23 }, (_, i) => `rep-${i}`);
    const batches: string[][] = [];
    const request = jest.fn(async (req: Req) => {
      if (req.path === '/internal/alertzero/hunt/candidates') {
        batches.push(req.body?.report_ids ?? []);
        return { data: { ids: req.body?.report_ids ?? [], skipped: [] } };
      }
      if (req.path.endsWith('/run')) return { data: { workflowExecutionId: 'sweep-1' } };
      if (req.path.endsWith('/children')) return { data: [] };
      return { data: { status: 'completed' } };
    });
    const client = new HuntWatchClient({ request } as unknown as KbnClient, log, {
      huntWorkerWorkflowId: 'worker-1',
      esClient: { indices: { refresh: async () => ({}) } },
      pollIntervalMs: 1,
    });
    await client.runHunts(ids);
    expect(batches.map((b) => b.length)).toEqual([10, 10, 3]);
  });

  it('a same-length candidates response with a foreign id invalidates the batch', async () => {
    // Regression (Libra): the old guard compared lengths only, so a response
    // that swapped one requested id for a foreign one passed the control.
    const request = jest.fn(async (req: Req) => {
      if (req.path === '/internal/alertzero/hunt/candidates') {
        return { data: { ids: ['rep-0', 'foreign-9'], skipped: [] } };
      }
      throw new Error('sweep must not run for an invalid batch');
    });
    const client = new HuntWatchClient({ request } as unknown as KbnClient, log, {
      huntWorkerWorkflowId: 'worker-1',
      esClient: { indices: { refresh: async () => ({}) } },
    });
    const { runs, invalidBatches } = await client.runHunts(['rep-0', 'rep-1']);
    expect(runs.size).toBe(0);
    expect(invalidBatches).toHaveLength(1);
  });

  it('a same-length candidates response with a duplicate id invalidates the batch', async () => {
    const request = jest.fn(async (req: Req) => {
      if (req.path === '/internal/alertzero/hunt/candidates') {
        return { data: { ids: ['rep-0', 'rep-0'], skipped: [] } };
      }
      throw new Error('sweep must not run for an invalid batch');
    });
    const client = new HuntWatchClient({ request } as unknown as KbnClient, log, {
      huntWorkerWorkflowId: 'worker-1',
      esClient: { indices: { refresh: async () => ({}) } },
    });
    const { runs, invalidBatches } = await client.runHunts(['rep-0', 'rep-1']);
    expect(runs.size).toBe(0);
    expect(invalidBatches).toHaveLength(1);
  });
});

describe('candidatesMatchBatch (per-batch ids == batch control)', () => {
  const ok = { ids: ['a', 'b'], skipped: [] };
  it('an exact set matches', () => {
    expect(candidatesMatchBatch(['a', 'b'], ok)).toBe(true);
  });
  it('order does not matter', () => {
    expect(candidatesMatchBatch(['b', 'a'], ok)).toBe(true);
  });
  it('a foreign id of the same length fails', () => {
    expect(candidatesMatchBatch(['a', 'c'], ok)).toBe(false);
  });
  it('a duplicate id of the same length fails', () => {
    expect(candidatesMatchBatch(['a', 'a'], { ids: ['a', 'b'], skipped: [] })).toBe(false);
    expect(candidatesMatchBatch(['a', 'b'], { ids: ['a', 'a'], skipped: [] })).toBe(false);
  });
  it('a length mismatch or any skipped entry fails', () => {
    expect(candidatesMatchBatch(['a'], ok)).toBe(false);
    expect(
      candidatesMatchBatch(['a', 'b'], { ids: ['a', 'b'], skipped: [{ id: 'a', reason: 'x' }] })
    ).toBe(false);
  });
});
