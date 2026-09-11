/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under
 * one or more contributor license agreements. Licensed under the Elastic
 * License 2.0; you may not use this file except in compliance with the Elastic
 * License 2.0.
 */
import { enableDeepWatch, runDeepWatch } from './deep_watch_run';

/** HttpHandler double: records calls, answers from a route table. */
const fakeFetch = (routes: Record<string, (body?: string) => unknown>) => {
  const calls: Array<{ path: string; method: string; body?: string }> = [];
  const fetch = jest.fn(
    async (
      path: string,
      init?: { method?: string; body?: string; headers?: Record<string, string> }
    ) => {
      calls.push({ path, method: init?.method ?? 'GET', body: init?.body });
      for (const [prefix, handler] of Object.entries(routes)) {
        if (path.startsWith(prefix)) return handler(init?.body);
      }
      throw new Error(`unexpected fetch: ${path}`);
    }
  );
  return { fetch, calls };
};

const fakeLog = () =>
  ({ info: jest.fn(), warning: jest.fn(), error: jest.fn(), debug: jest.fn() }) as never;

describe('enableDeepWatch', () => {
  it('PATCHes the watch enable route before any execution can run', async () => {
    const { fetch, calls } = fakeFetch({
      '/internal/pnd/watches': () => ({ outcome: 'updated' }),
    });
    await enableDeepWatch({ fetch: fetch as never, log: fakeLog() });
    const call = calls.find((c) => c.path.includes('system-security-watch-deep'));
    expect(call).toBeDefined();
    expect(call?.method).toBe('PATCH');
    expect(JSON.parse(call?.body ?? '{}')).toEqual({ enabled: true });
  });
});

describe('runDeepWatch', () => {
  const CONNECTOR = 'eis-test-connector';

  const itStubsTerminal = (status: string, output: Record<string, unknown>) => {
    const { fetch, calls } = fakeFetch({
      '/api/workflows/workflow/system-security-watch-deep-default/run': (body) => {
        expect(JSON.parse(body ?? '{}').inputs.attack_discovery_alert_id).toBeDefined();
        expect(JSON.parse(body ?? '{}').inputs.connector_id).toBe(CONNECTOR);
        return { workflowExecutionId: 'exec-1' };
      },
      '/api/workflows/executions/exec-1': () => ({ status, context: { output } }),
    });
    return { fetch, calls };
  };

  it('runs the -default workflow id, pins the connector, and reads context.output', async () => {
    const output = { isIncident: true, gate: 'assessed', rationale: 'x' };
    const { fetch, calls } = itStubsTerminal('completed', output);
    const result = await runDeepWatch({
      fetch: fetch as never,
      log: fakeLog(),
      attackDiscoveryAlertId: 'dw-001',
      connectorId: CONNECTOR,
      pollIntervalMs: 1,
    });
    expect(calls.map((c) => c.path)).toContain(
      '/api/workflows/workflow/system-security-watch-deep-default/run'
    );
    // context.output is authoritative: the top-level execution.output is null
    // on this engine.
    expect(result.output).toEqual(output);
    expect(result.status).toBe('completed');
  });

  it('treats failed/cancelled/timedOut as terminal and returns their status', async () => {
    for (const status of ['failed', 'cancelled', 'timedOut', 'timed_out']) {
      const { fetch } = itStubsTerminal(status, {});
      const result = await runDeepWatch({
        fetch: fetch as never,
        log: fakeLog(),
        attackDiscoveryAlertId: 'dw-001',
        connectorId: CONNECTOR,
        pollIntervalMs: 1,
      });
      expect(result.status).toBe(status);
    }
  });

  it('keeps polling a running execution instead of returning early', async () => {
    let polls = 0;
    const { fetch } = fakeFetch({
      '/api/workflows/workflow/system-security-watch-deep-default/run': () => ({
        workflowExecutionId: 'exec-1',
      }),
      '/api/workflows/executions/exec-1': () => {
        polls += 1;
        return polls < 3 ? { status: 'running' } : { status: 'completed', context: { output: {} } };
      },
    });
    const result = await runDeepWatch({
      fetch: fetch as never,
      log: fakeLog(),
      attackDiscoveryAlertId: 'dw-001',
      connectorId: CONNECTOR,
      pollIntervalMs: 1,
    });
    expect(polls).toBe(3);
    expect(result.status).toBe('completed');
  });

  it('throws when the execution never reaches a terminal status within the budget', async () => {
    const { fetch } = fakeFetch({
      '/api/workflows/workflow/system-security-watch-deep-default/run': () => ({
        workflowExecutionId: 'exec-1',
      }),
      '/api/workflows/executions/exec-1': () => ({ status: 'running' }),
    });
    await expect(
      runDeepWatch({
        fetch: fetch as never,
        log: fakeLog(),
        attackDiscoveryAlertId: 'dw-001',
        connectorId: CONNECTOR,
        pollIntervalMs: 5,
        maxWaitMs: 20,
      })
    ).rejects.toThrow(/did not finish within 20ms/);
  });
});
