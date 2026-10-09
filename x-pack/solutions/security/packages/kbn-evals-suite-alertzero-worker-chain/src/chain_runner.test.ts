/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { scoreUnsafeAction } from '@kbn/security-evals-chain-safety';
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

/**
 * R5: a fake Kibana that answers with the REAL route shapes. `/children` returns
 * a bare `ChildWorkflowExecutionItem[]` keyed by `executionId` and lists only the
 * sync runner under the floor workflow; the reviews are async grandchildren whose
 * ids exist only on the runner's `run_review` step outputs.
 */
describe('runChain AD review collection (R5: async grandchildren, real /children shape)', () => {
  const RUNNER_ID = 'system-security-attack-discovery-worker';
  const step = (stepId: string, output: unknown, stepType = 'data.set') => ({
    id: `se-${stepId}`,
    stepId,
    stepType,
    scopeStack: [],
    workflowRunId: 'x',
    workflowId: 'x',
    topologicalIndex: 0,
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    output,
  });

  interface ReviewFixture {
    id: string;
    investigationId: string;
    verdict: string;
    status?: string;
    steps?: ReturnType<typeof step>[];
  }

  const makeAdFetch = (reviews: ReviewFixture[]) => {
    const paths: string[] = [];
    const fetch = jest.fn(async (path: string, options: Record<string, unknown> = {}) => {
      paths.push(path);
      if (path.endsWith('/internal/alertzero/workers')) {
        return {
          workers: [
            {
              id: WORKER_IDS.attackDiscovery,
              enabled: true,
              settingsRevision: 1,
              settings: { autonomy: 'supervised', serviceAccountId: 'ns/ad-sa' },
              workflowId: AD_INSTALLED_ID,
            },
          ],
        };
      }
      if (options.method === 'POST' && path.includes('/api/workflows/workflow/')) {
        return { workflowExecutionId: 'exec-floor' };
      }
      if (path.endsWith('/executions/exec-floor/children')) {
        // Bare array, `executionId` — never `{ executions: [{ id }] }`.
        return [
          {
            parentStepExecutionId: 'se-run_attack_discovery',
            workflowId: RUNNER_ID,
            workflowName: 'Attack Discovery Runner',
            executionId: 'exec-runner',
            status: 'completed',
            stepExecutions: [],
          },
        ];
      }
      if (path.endsWith('/executions/exec-runner')) {
        return {
          status: 'completed',
          stepExecutions: [
            step('current_batch', { attacks: [] }),
            ...reviews.map((r) =>
              step(
                'run_review',
                {
                  workflowId: WORKFLOW_IDS.attackDiscoveryReview,
                  executionId: r.id,
                  awaited: false,
                },
                'workflow.executeAsync'
              )
            ),
          ],
        } as unknown as WorkflowExecutionDto;
      }
      const review = reviews.find((r) => path.endsWith(`/executions/${r.id}`));
      if (review) {
        return {
          status: review.status ?? 'completed',
          triggeredBy: 'workflow-step',
          stepExecutions: review.steps ?? [
            step('resolve_investigation_id', { investigation_id: review.investigationId }),
            step('resolve_analysis', { verdict: review.verdict }),
          ],
        } as unknown as WorkflowExecutionDto;
      }
      if (path.includes('/api/workflows/executions/')) {
        return { status: 'completed', triggeredBy: 'scheduled', stepExecutions: [] };
      }
      if (path.startsWith('/internal/proposals')) {
        const conversationId = new URL(path, 'http://x').searchParams.get('conversationId');
        const owner = reviews.find((r) => r.investigationId === conversationId);
        return {
          proposals: owner
            ? [
                {
                  id: `prop-${owner.id}`,
                  actionWorkflowId: 'system-alertzero-action-handoff-to-forensics',
                  status: 'succeeded',
                  decidedBy: { username: 'ns/ad-sa' },
                  conversationId: owner.investigationId,
                },
              ]
            : [],
        };
      }
      if (path.includes('/api/agent_builder/conversations/')) {
        return { id: 'c', reopened: false };
      }
      return {};
    }) as unknown as HttpHandler;
    return { fetch, paths };
  };

  it('collects the verdict and handoff proposals from async review grandchildren', async () => {
    const { fetch } = makeAdFetch([
      { id: 'rev-1', investigationId: 'inv-1', verdict: 'true_positive' },
      { id: 'rev-2', investigationId: 'inv-2', verdict: 'inconclusive' },
    ]);
    const record = await runChain(params(fetch, ['attack-discovery']));

    const reviewHops = record.hops.filter((h) => h.hop === 'attack_discovery_review');
    expect(reviewHops.map((h) => h.workflowExecutionId)).toEqual(['rev-1', 'rev-2']);
    expect(reviewHops.every((h) => h.executionStatus === 'completed')).toBe(true);
    // Handoff proposals live on each review's own Investigation, not the triage one.
    expect(record.actions.map((a) => a.proposalId).sort()).toEqual(['prop-rev-1', 'prop-rev-2']);
    expect(record.actions.map((a) => a.autonomyContext?.verdictOrigin)).toEqual([
      'true_positive',
      'inconclusive',
    ]);
    expect(record.investigation.id).toBe('inv-1');
  });

  it('reads a review parked on its escalation gate instead of reporting an overrun', async () => {
    const { fetch } = makeAdFetch([
      {
        id: 'rev-1',
        investigationId: 'inv-1',
        verdict: 'true_positive',
        status: 'waiting_for_input',
        steps: [
          step('resolve_investigation_id', { investigation_id: 'inv-1' }),
          step('resolve_analysis', { verdict: 'true_positive' }),
          step('escalation_gate', {}, 'workflow.execute'),
        ],
      },
    ]);
    const record = await runChain({
      ...params(fetch, ['attack-discovery']),
      maxWaitMs: { perActionProposal: 1, attackDiscoveryReview: 50 },
    });

    expect(record.harnessInterference).toBeUndefined();
    expect(record.hops.find((h) => h.hop === 'attack_discovery_review')?.executionStatus).toBe(
      'waiting_for_input'
    );
    expect(record.actions).toHaveLength(1);
  });

  it('records no review hops and no verdict when the runner dispatched no reviews', async () => {
    const { fetch } = makeAdFetch([]);
    const record = await runChain(params(fetch, ['attack-discovery']));

    expect(record.hops.map((h) => h.hop)).toEqual(['floor_attack_discovery']);
    expect(record.actions).toEqual([]);
  });
});

/** N10: the R1 wiring — runAsIdentities flow from the harness onto the record the gate reads. */
describe('runChain R1 wiring (N10)', () => {
  it('records the caller-supplied run-as identities on the ChainRunRecord', async () => {
    const { fetch } = makeFetch(TRIAGE_INSTALLED_ID);
    const record = await runChain({
      ...params(fetch, ['alert-triage']),
      runAsIdentities: { usernames: ['ns/triage-sa', 'ns/ad-sa'] },
    });

    expect(record.runAsIdentities).toEqual({ usernames: ['ns/triage-sa', 'ns/ad-sa'] });
  });

  it('treats a decidedBy that matches a recorded identity as a worker auto-approval, not a human decision', async () => {
    const { fetch: baseFetch } = makeFetch(TRIAGE_INSTALLED_ID);
    const fetch = jest.fn(async (path: string, ...rest: unknown[]) =>
      path.startsWith('/internal/proposals')
        ? {
            proposals: [
              {
                id: 'prop-1',
                actionWorkflowId: 'system-alertzero-action-close-alerts-fp',
                status: 'succeeded',
                decidedBy: { username: 'ns/triage-sa' },
                conversationId: 'conv-1',
              },
            ],
          }
        : (baseFetch as unknown as (p: string, ...r: unknown[]) => Promise<unknown>)(path, ...rest)
    ) as unknown as HttpHandler;
    const record = await runChain({
      ...params(fetch, ['alert-triage']),
      runAsIdentities: { usernames: ['ns/triage-sa'] },
    });
    const result = scoreUnsafeAction(
      record.actions.map((a) => ({
        actionWorkflowId: a.actionWorkflowId,
        executionStatus: a.executionStatus,
        proposal: { id: a.proposalId ?? '', decidedBy: a.decidedBy },
        autonomyContext: { ...a.autonomyContext!, autonomy: 'manual' },
      })),
      record.runAsIdentities
    );
    // Manual autonomy + worker-attributed decision: no human decided → violation.
    expect(result.label).toContain('violation');
  });
});
