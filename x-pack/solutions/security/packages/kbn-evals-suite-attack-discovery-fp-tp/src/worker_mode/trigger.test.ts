/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import type { FpTpLiveKbnRequest } from '../world';
import {
  enableAdWorker,
  findGeneratedAttacks,
  isReviewSettled,
  readGenerationErrors,
  startFloorRun,
  toInvestigationId,
  toReviewProgress,
  waitForFloorRun,
  waitForReviews,
} from './trigger';

type KbnCall = Parameters<FpTpLiveKbnRequest>[0];

const ATTACK_ID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const routeStub = (
  routes: ReadonlyArray<[(call: KbnCall) => boolean, unknown]>
): jest.Mock & FpTpLiveKbnRequest =>
  jest.fn(async (call: KbnCall) => {
    const route = routes.find(([matches]) => matches(call));
    if (route === undefined) {
      return { statusCode: 404, body: { message: `no stub for ${call.method} ${call.path}` } };
    }
    return { statusCode: 200, body: route[1] };
  }) as jest.Mock & FpTpLiveKbnRequest;

const execution = (
  status: ExecutionStatus,
  steps: Array<{ stepId: string; output: Record<string, unknown> }> = []
): WorkflowExecutionDto =>
  ({
    id: 'review-1',
    status,
    startedAt: '2026-10-14T12:00:00.000Z',
    stepExecutions: steps.map(({ stepId, output }) => ({
      stepId,
      output,
      status: ExecutionStatus.COMPLETED,
    })),
  } as unknown as WorkflowExecutionDto);

const worker = (overrides: Record<string, unknown> = {}) => ({
  id: 'system-security-floor-attack-discovery',
  enabled: false,
  settings: { autonomy: 'manual' },
  settingsRevision: 3,
  workflowId: 'system-security-floor-attack-discovery-qa-fp',
  blockingReasons: [],
  ...overrides,
});

const isWorkersList = ({ method, path }: KbnCall) =>
  method === 'GET' && path === '/internal/alertzero/workers';
const isWorkerPatch = ({ method, path }: KbnCall) =>
  method === 'PATCH' &&
  path === '/internal/alertzero/workers/system-security-floor-attack-discovery';

const log = new ToolingLog();

describe('toInvestigationId', () => {
  it('returns the UUIDv8 the review derives from the attack id', () => {
    expect(toInvestigationId(ATTACK_ID)).toBe('01234567-89ab-8cde-8f01-23456789abcd');
  });
});

describe('toReviewProgress', () => {
  it('returns the verdict and investigation from the review steps', () => {
    const progress = toReviewProgress(
      ATTACK_ID,
      execution(ExecutionStatus.WAITING_FOR_CHILD, [
        { stepId: 'resolve_investigation_id', output: { investigation_id: 'inv-1' } },
        { stepId: 'resolve_analysis', output: { verdict: 'inconclusive' } },
      ])
    );
    expect(progress).toEqual({
      attackId: ATTACK_ID,
      reviewExecutionId: 'review-1',
      reviewStatus: ExecutionStatus.WAITING_FOR_CHILD,
      investigationId: 'inv-1',
      verdict: 'inconclusive',
    });
    expect(isReviewSettled(progress)).toBe(true);
  });

  it('returns no verdict while the analysis is still running', () => {
    const progress = toReviewProgress(ATTACK_ID, execution(ExecutionStatus.WAITING_FOR_CHILD));
    expect(progress.verdict).toBeUndefined();
    expect(progress.investigationId).toBe(toInvestigationId(ATTACK_ID));
    expect(isReviewSettled(progress)).toBe(false);
  });

  it('returns a settled review when the run ended without a verdict', () => {
    expect(isReviewSettled(toReviewProgress(ATTACK_ID, execution(ExecutionStatus.FAILED)))).toBe(
      true
    );
  });

  it('returns an unsettled review when no review has started yet', () => {
    expect(isReviewSettled(toReviewProgress(ATTACK_ID, undefined))).toBe(false);
  });
});

describe('enableAdWorker', () => {
  it('returns the floor workflow without patching an enabled manual worker', async () => {
    const kbnRequest = routeStub([
      [
        isWorkersList,
        {
          workers: [
            worker({ enabled: true, settings: { autonomy: 'manual', serviceAccountId: 'sa-1' } }),
          ],
        },
      ],
    ]);
    await expect(enableAdWorker({ kbnRequest })).resolves.toEqual({
      workflowId: 'system-security-floor-attack-discovery-qa-fp',
      enabledNow: false,
    });
    expect(kbnRequest.mock.calls.filter(([call]) => isWorkerPatch(call))).toEqual([]);
  });

  it('enables a disabled worker with manual autonomy and its stored account', async () => {
    const kbnRequest = routeStub([
      [
        isWorkersList,
        { workers: [worker({ settings: { autonomy: 'supervised', serviceAccountId: 'sa-1' } })] },
      ],
      [isWorkerPatch, { worker: worker({ enabled: true }) }],
    ]);
    await expect(enableAdWorker({ kbnRequest })).resolves.toEqual({
      workflowId: 'system-security-floor-attack-discovery-qa-fp',
      enabledNow: true,
    });
    const [[patch]] = kbnRequest.mock.calls.filter(([call]) => isWorkerPatch(call));
    expect(patch.body).toEqual({
      enabled: true,
      settingsRevision: 3,
      settings: { autonomy: 'manual', serviceAccountId: 'sa-1' },
    });
  });

  it("creates the worker's service account when none exists", async () => {
    const kbnRequest = routeStub([
      [isWorkersList, { workers: [worker({ settingsRevision: null })] }],
      [
        ({ method, path }) =>
          method === 'GET' && path.startsWith('/internal/security/service_account'),
        { serviceAccounts: [{ id: 'other', name: 'other', enabled: true, assumable: true }] },
      ],
      [
        ({ method, path }) => method === 'POST' && path === '/internal/security/service_account',
        { id: 'kibana/alertzero_attack_discovery' },
      ],
      [isWorkerPatch, { worker: worker({ enabled: true }) }],
    ]);
    await enableAdWorker({ kbnRequest });
    const [[create]] = kbnRequest.mock.calls.filter(
      ([{ method, path }]) => method === 'POST' && path === '/internal/security/service_account'
    );
    expect(create.body).toEqual(
      expect.objectContaining({
        name: 'alertzero_attack_discovery',
        roles: ['alertzero_attack_discovery'],
      })
    );
    const [[patch]] = kbnRequest.mock.calls.filter(([call]) => isWorkerPatch(call));
    expect(patch.body).toEqual({
      enabled: true,
      settingsRevision: null,
      settings: { autonomy: 'manual', serviceAccountId: 'kibana/alertzero_attack_discovery' },
    });
  });

  it('uses the account another seed created concurrently when the create returns 409', async () => {
    let lists = 0;
    const kbnRequest = jest.fn(async ({ method, path }: KbnCall) => {
      if (isWorkersList({ method, path })) {
        return { statusCode: 200, body: { workers: [worker({ settingsRevision: null })] } };
      }
      if (method === 'GET' && path.startsWith('/internal/security/service_account')) {
        lists += 1;
        return {
          statusCode: 200,
          body: {
            serviceAccounts:
              lists === 1
                ? []
                : [
                    {
                      id: 'kibana/alertzero_attack_discovery',
                      name: 'alertzero_attack_discovery',
                      enabled: true,
                      assumable: true,
                    },
                  ],
          },
        };
      }
      if (method === 'POST' && path === '/internal/security/service_account') {
        return { statusCode: 409, body: { message: 'version_conflict_engine_exception' } };
      }
      return { statusCode: 200, body: { worker: worker({ enabled: true }) } };
    }) as jest.Mock & FpTpLiveKbnRequest;

    await enableAdWorker({ kbnRequest });

    const [[patch]] = kbnRequest.mock.calls.filter(([call]) => isWorkerPatch(call));
    expect(patch.body).toEqual(
      expect.objectContaining({
        settings: { autonomy: 'manual', serviceAccountId: 'kibana/alertzero_attack_discovery' },
      })
    );
  });

  it('throws when the space has no model for the worker', async () => {
    const kbnRequest = routeStub([
      [isWorkersList, { workers: [worker({ blockingReasons: ['no_model'] })] }],
    ]);
    await expect(enableAdWorker({ kbnRequest })).rejects.toThrow('no_model');
  });
});

describe('startFloorRun', () => {
  const isList = ({ method, path }: KbnCall) =>
    method === 'GET' && path.startsWith('/api/workflows/workflow/floor-qa/executions?');
  const isRun = ({ method, path }: KbnCall) =>
    method === 'POST' && path === '/api/workflows/workflow/floor-qa/run';

  it('adopts a floor run already in flight', async () => {
    const kbnRequest = routeStub([
      [isList, { results: [{ id: 'auto-run', status: ExecutionStatus.RUNNING }] }],
    ]);
    await expect(
      startFloorRun({ kbnRequest, workflowId: 'floor-qa', since: 'now', enabledNow: false })
    ).resolves.toBe('auto-run');
    expect(kbnRequest.mock.calls.filter(([call]) => isRun(call))).toEqual([]);
  });

  it('starts a run when none is in flight', async () => {
    const kbnRequest = routeStub([
      [isList, { results: [] }],
      [isRun, { workflowExecutionId: 'new-run' }],
    ]);
    await expect(
      startFloorRun({
        kbnRequest,
        workflowId: 'floor-qa',
        since: '2026-10-14T12:00:00.000Z',
        enabledNow: false,
      })
    ).resolves.toBe('new-run');
    const [[list]] = kbnRequest.mock.calls;
    expect(new URLSearchParams(list.path.split('?')[1]).getAll('statuses')).toEqual(
      expect.arrayContaining(['running', 'pending', 'waiting_for_child'])
    );
  });
});

describe('waitForFloorRun', () => {
  it('follows the newer run that cancelled the one it waits on', async () => {
    const kbnRequest = routeStub([
      [
        ({ path }) => path.startsWith('/api/workflows/executions/old-run'),
        { ...execution(ExecutionStatus.CANCELLED), id: 'old-run' },
      ],
      [
        ({ path }) => path.startsWith('/api/workflows/workflow/floor-qa/executions?'),
        { results: [{ id: 'new-run', status: ExecutionStatus.RUNNING }] },
      ],
      [
        ({ path }) => path.startsWith('/api/workflows/executions/new-run'),
        { ...execution(ExecutionStatus.COMPLETED), id: 'new-run' },
      ],
    ]);
    const finished = await waitForFloorRun({
      kbnRequest,
      workflowId: 'floor-qa',
      executionId: 'old-run',
      deadline: Date.now() + 60_000,
      log,
    });
    expect(finished).toEqual(expect.objectContaining({ id: 'new-run', status: 'completed' }));
  });
});

describe('waitForReviews', () => {
  it('finds each review by its concurrency key and returns its verdict', async () => {
    const kbnRequest = routeStub([
      [
        ({ path }) =>
          path.startsWith(
            '/api/workflows/workflow/system-security-attack-discovery-review/executions?'
          ),
        { results: [{ id: 'review-1', status: ExecutionStatus.WAITING_FOR_CHILD }] },
      ],
      [
        ({ path }) => path.startsWith('/api/workflows/executions/review-1'),
        execution(ExecutionStatus.WAITING_FOR_CHILD, [
          { stepId: 'resolve_analysis', output: { verdict: 'true_positive' } },
        ]),
      ],
    ]);
    const [progress] = await waitForReviews({
      kbnRequest,
      attackIds: [ATTACK_ID],
      deadline: Date.now() + 60_000,
      log,
    });
    expect(progress.verdict).toBe('true_positive');
    const [[list]] = kbnRequest.mock.calls;
    expect(new URLSearchParams(list.path.split('?')[1]).get('concurrencyGroupKey')).toBe(
      `attack-discovery-review-${ATTACK_ID}`
    );
  });
});

describe('findGeneratedAttacks', () => {
  it('returns attacks in the space ad-hoc index that cite a seeded alert', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: ATTACK_ID,
            _source: {
              'kibana.alert.attack_discovery.title': 'Encoded PowerShell',
              'kibana.alert.attack_discovery.alert_ids': ['a1', 'a2'],
            },
          },
        ],
      },
    });
    const attacks = await findGeneratedAttacks({
      esClient: { search } as unknown as EsClient,
      space: 'qa-fp',
      alertIds: ['a1', 'a2'],
      since: '2026-10-14T12:00:00.000Z',
    });
    expect(attacks).toEqual([
      { attackId: ATTACK_ID, title: 'Encoded PowerShell', alertIds: ['a1', 'a2'] },
    ]);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.adhoc.alerts-security.attack.discovery.alerts-qa-fp',
        query: {
          bool: {
            filter: [
              { terms: { 'kibana.alert.attack_discovery.alert_ids': ['a1', 'a2'] } },
              { range: { '@timestamp': { gte: '2026-10-14T12:00:00.000Z' } } },
            ],
          },
        },
      })
    );
  });
});

describe('readGenerationErrors', () => {
  it('returns the batch errors of the generation run under the floor run', async () => {
    const kbnRequest = routeStub([
      [
        ({ path }) => path === '/api/workflows/executions/floor-run/children',
        [{ executionId: 'runner-run', workflowId: 'system-security-attack-discovery-worker' }],
      ],
      [
        ({ path }) => path === '/api/workflows/executions/runner-run/children',
        [
          {
            executionId: 'generation-run',
            workflowId: 'system-security-attack-discovery-batched-generation',
          },
        ],
      ],
      [
        ({ path }) => path.startsWith('/api/workflows/executions/generation-run?'),
        {
          ...execution(ExecutionStatus.COMPLETED),
          context: {
            output: {
              batch_errors: [
                { message: 'Attack Discovery workflows are not enabled for this space' },
              ],
            },
          },
        },
      ],
    ]);
    await expect(readGenerationErrors(kbnRequest, 'floor-run')).resolves.toEqual([
      'Attack Discovery workflows are not enabled for this space',
    ]);
  });
});
