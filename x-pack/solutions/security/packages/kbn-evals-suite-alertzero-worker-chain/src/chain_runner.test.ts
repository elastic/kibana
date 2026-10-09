/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { runChain, type ChainScenario } from './chain_runner';
import { WORKER_IDS, WORKFLOW_IDS } from './constants';

const TRIAGE_INSTALLED_ID = 'system-security-floor-alert-triage-default';

const log = { warning: jest.fn(), info: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

/**
 * Fake Kibana that only knows the registered Worker ids, like the real Workers
 * API: asking it for a workflow id (e.g. the AD runner) throws in the harness.
 */
const makeFetch = (triageWorkflowId: string | null) => {
  const runs: string[] = [];
  const fetch = jest.fn(async (path: string, options: Record<string, unknown> = {}) => {
    if (path.endsWith('/internal/alertzero/workers')) {
      return {
        workers: [
          {
            id: WORKER_IDS.alertTriage,
            enabled: true,
            settingsRevision: 1,
            settings: { autonomy: 'supervised' },
            workflowId: triageWorkflowId,
          },
          {
            id: WORKER_IDS.attackDiscovery,
            enabled: true,
            settingsRevision: 1,
            settings: { autonomy: 'manual' },
            workflowId: null,
          },
        ],
      };
    }
    if (options.method === 'POST' && path.includes('/api/workflows/workflow/')) {
      runs.push(path);
      return { workflowExecutionId: `exec-${runs.length}` };
    }
    if (path.includes('/api/workflows/executions/')) {
      return { status: 'completed', steps: [], context: {} };
    }
    return {};
  }) as unknown as HttpHandler;
  return { fetch, runs };
};

const scenario = (workerChain: ChainScenario['workerChain']): ChainScenario => ({
  key: 'k',
  workerChain,
  declaredAutonomy: {},
  alerts: [{ id: 'a1' }],
  rule: { id: 'r1', name: 'rule' },
  goldVerdict: 'true_positive',
});

const params = (fetch: HttpHandler, workerChain: ChainScenario['workerChain']) => ({
  ctx: { fetch, spaceId: 'default' },
  log,
  scenario: scenario(workerChain),
  baseSha: 'abc',
  triageTrigger: 'manual-event' as const,
  forensicsSweepMode: 'blocked' as const,
  pollIntervalMs: 1,
  maxWaitMs: { perActionProposal: 1 },
});

describe('runChain run targets', () => {
  it('runs the triage Worker by its installed per-space workflow id and records it on the hop', async () => {
    const { fetch, runs } = makeFetch(TRIAGE_INSTALLED_ID);
    const record = await runChain(params(fetch, ['alert-triage']));

    expect(runs).toEqual([`/api/workflows/workflow/${TRIAGE_INSTALLED_ID}/run`]);
    expect(record.hops[0].workflowId).toBe(TRIAGE_INSTALLED_ID);
  });

  it('falls back to the bare workflow id only when the Worker is not installed', async () => {
    const { fetch, runs } = makeFetch(null);
    await runChain(params(fetch, ['alert-triage']));

    expect(runs).toEqual([`/api/workflows/workflow/${WORKFLOW_IDS.alertTriage}/run`]);
  });

  it('reads AD autonomy by Worker id but runs the runner workflow id', async () => {
    const { fetch, runs } = makeFetch(TRIAGE_INSTALLED_ID);
    const record = await runChain(params(fetch, ['attack-discovery']));

    expect(runs).toEqual([`/api/workflows/workflow/${WORKFLOW_IDS.attackDiscoveryRunner}/run`]);
    // Applied autonomy came from the registered AD Worker's saved setting.
    expect(record.appliedAutonomy['attack-discovery']).toBe('manual');
  });
});
