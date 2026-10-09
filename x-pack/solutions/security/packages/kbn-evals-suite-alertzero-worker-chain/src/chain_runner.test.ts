/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { runChain, type ChainScenario } from './chain_runner';
import { WORKER_IDS, WORKFLOW_IDS } from './constants';

const TRIAGE_INSTALLED_ID = 'system-security-floor-alert-triage-default';
const AD_INSTALLED_ID = 'system-security-floor-attack-discovery-default';

const log = { warning: jest.fn(), info: jest.fn(), debug: jest.fn() } as unknown as ToolingLog;

/**
 * Fake Kibana that only knows the registered Worker ids, like the real Workers
 * API: asking it for a workflow id (e.g. the AD runner) throws in the harness.
 * The triage execution DTO carries a create_investigation stepExecution whose
 * output is the conversation id — the field is `stepExecutions`, not `steps`
 * (R3). Workers run as `settings.serviceAccountId` (R1).
 */
const makeFetch = (triageWorkflowId: string | null, adWorkflowId: string | null = null) => {
  const runs: string[] = [];
  const fetch = jest.fn(async (path: string, options: Record<string, unknown> = {}) => {
    if (path.endsWith('/internal/alertzero/workers')) {
      return {
        workers: [
          {
            id: WORKER_IDS.alertTriage,
            enabled: true,
            settingsRevision: 1,
            settings: { autonomy: 'supervised', serviceAccountId: 'ns/triage-sa' },
            workflowId: triageWorkflowId,
          },
          {
            id: WORKER_IDS.attackDiscovery,
            enabled: true,
            settingsRevision: 1,
            settings: { autonomy: 'manual', serviceAccountId: 'ns/ad-sa' },
            workflowId: adWorkflowId,
          },
        ],
      };
    }
    if (options.method === 'POST' && path.includes('/api/workflows/workflow/')) {
      runs.push(path);
      return { workflowExecutionId: `exec-${runs.length}` };
    }
    if (path.includes('/api/workflows/executions/')) {
      // R3: the execution DTO field is `stepExecutions` (WorkflowExecutionDto);
      // the create_investigation step's output carries the conversation id.
      return {
        status: 'completed',
        triggeredBy: 'manual',
        stepExecutions: [
          {
            id: 'step-exec-1',
            stepId: 'create_investigation',
            scopeStack: [],
            workflowRunId: 'exec-1',
            workflowId: TRIAGE_INSTALLED_ID,
            topologicalIndex: 0,
            globalExecutionIndex: 0,
            stepExecutionIndex: 0,
            output: { conversation_id: 'conv-1' },
          },
        ],
      } as unknown as WorkflowExecutionDto;
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

  it('R3: reads the investigation id from stepExecutions[create_investigation] and hits the proposals URL with it', async () => {
    const { fetch, runs } = makeFetch(TRIAGE_INSTALLED_ID);
    let proposalsQuery;
    const instrumentedFetch = ((path: string, ...rest: unknown[]) => {
      if (path.startsWith('/internal/proposals')) proposalsQuery = path;
      return (fetch as unknown as (p: string, ...r: unknown[]) => Promise<unknown>)(path, ...rest);
    }) as unknown as HttpHandler;

    await runChain(params(instrumentedFetch, ['alert-triage']));

    expect(runs).toEqual([`/api/workflows/workflow/${TRIAGE_INSTALLED_ID}/run`]);
    expect(proposalsQuery).toBe('/internal/proposals?conversationId=conv-1');
  });

  it('R2: runs AD through the installed per-space floor workflow, never the bare runner id', async () => {
    const { fetch, runs } = makeFetch(TRIAGE_INSTALLED_ID, AD_INSTALLED_ID);
    const record = await runChain(params(fetch, ['attack-discovery']));

    expect(runs).toEqual([`/api/workflows/workflow/${AD_INSTALLED_ID}/run`]);
    expect(record.hops[0].workflowId).toBe(AD_INSTALLED_ID);
    // Applied autonomy came from the registered AD Worker's saved setting.
    expect(record.appliedAutonomy['attack-discovery']).toBe('manual');
  });
});
