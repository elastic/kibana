/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_FORENSICS_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
} from '@kbn/alertzero-common';
import {
  ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_RULE_CREATION_WORKFLOW_ID,
  ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
  ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID,
  ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID,
  ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  SCAN_FAILURE_MAX_PAGES,
  SCAN_FAILURE_PAGE_SIZE,
  ScanFailuresService,
  type FailedExecutionPage,
  type FailedExecutionSearch,
} from './scan_failures_service';

const request = httpServerMock.createKibanaRequest();
const WORKFLOW_STEP = 'workflow-step';
const FINISHED_AT = '2026-01-01T00:00:00.000Z';

const execution = (
  originManagedWorkflowId: string | null,
  workflowId?: string,
  extras?: { id?: string; triggeredBy?: string; parentId?: string }
): FailedExecutionPage['results'][number] =>
  ({
    id: extras?.id,
    originManagedWorkflowId,
    workflowId: workflowId ?? originManagedWorkflowId ?? undefined,
    triggeredBy: extras?.triggeredBy,
    finishedAt: FINISHED_AT,
    context: extras?.parentId ? { parentWorkflowExecutionId: extras.parentId } : undefined,
  }) as FailedExecutionPage['results'][number];

const page = (ids: Array<string | null>, total: number): FailedExecutionPage => ({
  results: ids.map((id) => execution(id)),
  total,
});

const createService = (
  search: FailedExecutionSearch['searchFailedManagedExecutions'],
  lookup: Map<string, FailedExecutionPage['results'][number]> = new Map(),
  latest: FailedExecutionSearch['getLatestWorkflowExecution'] = async () => undefined
) => {
  const logger = loggerMock.create();
  const executions: FailedExecutionSearch = {
    searchFailedManagedExecutions: search,
    getLatestWorkflowExecution: jest.fn(
      latest
    ) as FailedExecutionSearch['getLatestWorkflowExecution'],
    getWorkflowExecution: jest.fn(
      async (id: string) => lookup.get(id) ?? null
    ) as FailedExecutionSearch['getWorkflowExecution'],
  };
  return { logger, executions, service: new ScanFailuresService(executions, logger) };
};

/** A failed child whose parent execution is the catalog Worker that started it. */
const childStartedByWorker = (childDefinitionId: string, workerDefinitionId: string) => {
  const childId = `child-${childDefinitionId}`;
  const parentId = `parent-${workerDefinitionId}`;
  const child = execution(childDefinitionId, undefined, {
    id: childId,
    triggeredBy: WORKFLOW_STEP,
    parentId,
  });
  const parent = execution(workerDefinitionId, undefined, {
    id: parentId,
    triggeredBy: 'scheduled',
  });
  return {
    failedPage: { results: [child], total: 1 } satisfies FailedExecutionPage,
    lookup: new Map([
      [childId, child],
      [parentId, parent],
    ]),
  };
};

describe('ScanFailuresService', () => {
  it('drops an action workflow even when a Worker started it', async () => {
    const { failedPage, lookup } = childStartedByWorker(
      ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID,
      ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID
    );
    const search = jest.fn(async () => failedPage);
    const { service } = createService(search, lookup);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('reports the newest failure per Worker and overall', async () => {
    const older = {
      ...execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID),
      finishedAt: '2026-01-01T00:00:00.000Z',
    };
    const newer = {
      ...execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID),
      finishedAt: '2026-01-01T05:00:00.000Z',
    };
    const other = {
      ...execution(ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID),
      finishedAt: '2026-01-01T03:00:00.000Z',
    };
    const search = jest.fn(async () => ({ results: [older, newer, other], total: 3 }));
    const { service } = createService(search);

    const body = await service.list(request, 'analyst');

    expect(body.lastFailedAt).toBe('2026-01-01T05:00:00.000Z');
    expect(body.workers).toEqual([
      expect.objectContaining({
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        workflowId: ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
        lastFailedAt: '2026-01-01T05:00:00.000Z',
      }),
      expect.objectContaining({
        workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
        lastFailedAt: '2026-01-01T03:00:00.000Z',
      }),
    ]);
  });

  it('links the newest failed workflow, whether the Worker or a child', async () => {
    const { failedPage, lookup } = childStartedByWorker(
      ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
      ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID
    );
    const worker = {
      ...execution(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID),
      finishedAt: '2026-01-01T08:00:00.000Z',
    };
    const child = { ...failedPage.results[0], finishedAt: '2026-01-01T09:00:00.000Z' };
    const search = jest.fn(async () => ({ results: [worker, child], total: 2 }));
    const { service } = createService(search, lookup);

    const body = await service.list(request, 'default');

    expect(body.workers).toEqual([
      expect.objectContaining({
        workflowId: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
        lastFailedAt: '2026-01-01T09:00:00.000Z',
      }),
    ]);
  });

  it('falls back to the space-suffixed Worker workflow when the execution has no workflowId', async () => {
    const failed = {
      ...execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID),
      workflowId: undefined,
    };
    const search = jest.fn(async () => ({ results: [failed], total: 1 }));
    const { service } = createService(search);

    const body = await service.list(request, 'analyst');

    expect(body.workers).toEqual([
      expect.objectContaining({
        workflowId: `${SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID}-analyst`,
      }),
    ]);
  });

  describe('recovery', () => {
    const failedTriage = {
      results: [execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID)],
      total: 1,
    } satisfies FailedExecutionPage;
    const latestWith = (status: ExecutionStatus) => async () =>
      ({ status }) as FailedExecutionPage['results'][number];

    it('drops a Worker whose failed workflow has since completed', async () => {
      const latest = jest.fn(latestWith(ExecutionStatus.COMPLETED));
      const { service } = createService(async () => failedTriage, new Map(), latest);

      const body = await service.list(request, 'default');

      expect(body.workers).toEqual([]);
      expect(latest).toHaveBeenCalledWith(
        ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
        'default',
        request
      );
    });

    it.each([ExecutionStatus.FAILED, ExecutionStatus.RUNNING])(
      'keeps a Worker whose newest run is %s',
      async (status) => {
        const { service } = createService(async () => failedTriage, new Map(), latestWith(status));

        const body = await service.list(request, 'default');

        expect(body.workers).toHaveLength(1);
      }
    );

    it('keeps a Worker when the latest execution lookup throws', async () => {
      const { service, logger } = createService(
        async () => failedTriage,
        new Map(),
        async () => {
          throw new Error('boom');
        }
      );

      const body = await service.list(request, 'default');

      expect(body.workers).toHaveLength(1);
      expect(body.unknown).toBe(false);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('only drops the Workers that recovered', async () => {
      const search = async () => ({
        results: [
          execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID),
          execution(ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID),
        ],
        total: 2,
      });
      const { service } = createService(search, new Map(), async (workflowId) =>
        workflowId === ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID
          ? ({ status: ExecutionStatus.COMPLETED } as FailedExecutionPage['results'][number])
          : ({ status: ExecutionStatus.FAILED } as FailedExecutionPage['results'][number])
      );

      const body = await service.list(request, 'default');

      expect(body.workers.map(({ workerId }) => workerId)).toEqual([
        SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
      ]);
    });
  });

  it('reports a catalog Worker that failed on its own', async () => {
    const search = jest.fn(
      async () =>
        ({
          results: [
            execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID, undefined, {
              id: 'triage-run',
              triggeredBy: 'manual',
            }),
          ],
          total: 1,
        }) satisfies FailedExecutionPage
    );
    const { service } = createService(search);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('folds an Attack Discovery child onto the Worker that started it', async () => {
    const { failedPage, lookup } = childStartedByWorker(
      ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
      ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID
    );
    const search = jest.fn(async () => failedPage);
    const { service } = createService(search, lookup);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('folds the rule tuning sweep onto the Worker that started it', async () => {
    const { failedPage, lookup } = childStartedByWorker(
      ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
      ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID
    );
    const search = jest.fn(async () => failedPage);
    const { service } = createService(search, lookup);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
          watchId: SYSTEM_SECURITY_WATCH_DETECTION_ID,
          workflowId: ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('folds the closure review onto the Alert Triage Worker that started it', async () => {
    const { failedPage, lookup } = childStartedByWorker(
      ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
      ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID
    );
    const search = jest.fn(async () => failedPage);
    const { service } = createService(search, lookup);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('folds the forensics pass onto the Worker that started it', async () => {
    const { failedPage, lookup } = childStartedByWorker(
      ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
      ALERTZERO_WORKER_FORENSICS_ENDPOINT_ANALYSIS_WORKFLOW_ID
    );
    const search = jest.fn(async () => failedPage);
    const { service } = createService(search, lookup);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
          watchId: SYSTEM_SECURITY_WATCH_FORENSICS_ID,
          workflowId: ALERTZERO_FORENSICS_RUN_ENDPOINT_ANALYSIS_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('uses workflowId when originManagedWorkflowId is missing', async () => {
    const childId = 'child-review';
    const parentId = 'parent-attack-discovery';
    const child = execution(null, ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID, {
      id: childId,
      triggeredBy: WORKFLOW_STEP,
      parentId,
    });
    const parent = execution(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID, undefined, {
      id: parentId,
      triggeredBy: 'scheduled',
    });
    const search = jest.fn(async (): Promise<FailedExecutionPage> => ({
      results: [child],
      total: 1,
    }));
    const { service } = createService(
      search,
      new Map([
        [childId, child],
        [parentId, parent],
      ])
    );

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('walks past an intermediate child to the catalog Worker', async () => {
    const reviewId = 'review';
    const innerId = 'inner-worker';
    const rootId = 'root-worker';
    const review = execution(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID, undefined, {
      id: reviewId,
      triggeredBy: WORKFLOW_STEP,
      parentId: innerId,
    });
    const inner = execution(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID, undefined, {
      id: innerId,
      triggeredBy: WORKFLOW_STEP,
      parentId: rootId,
    });
    const root = execution(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID, undefined, {
      id: rootId,
      triggeredBy: 'scheduled',
    });
    const search = jest.fn(async (): Promise<FailedExecutionPage> => ({
      results: [review],
      total: 1,
    }));
    const { service } = createService(
      search,
      new Map([
        [reviewId, review],
        [innerId, inner],
        [rootId, root],
      ])
    );

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('keeps Workers it could attribute when a parent lookup throws', async () => {
    const search = jest.fn(async () => ({
      results: [
        execution(ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID, undefined, {
          id: 'triage-run',
          triggeredBy: 'manual',
        }),
        execution(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID, undefined, {
          id: 'review-run',
          triggeredBy: WORKFLOW_STEP,
          parentId: 'attack-discovery-run',
        }),
      ],
      total: 2,
    }));
    const logger = loggerMock.create();
    const executions: FailedExecutionSearch = {
      searchFailedManagedExecutions: search,
      getLatestWorkflowExecution: jest.fn(async () => undefined),
      getWorkflowExecution: jest.fn(async () => {
        throw new Error('workflows down');
      }),
    };
    const service = new ScanFailuresService(executions, logger);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: true,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('skips a child whose parent execution is missing', async () => {
    const search = jest.fn(async () => ({
      results: [
        execution(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID, undefined, {
          id: 'review-run',
          triggeredBy: WORKFLOW_STEP,
          parentId: 'gone',
        }),
      ],
      total: 1,
    }));
    const { service } = createService(search);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('skips a shared workflow that was not started by a Worker', async () => {
    const search = jest.fn(
      async () =>
        ({
          results: [
            execution(ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID, undefined, {
              id: 'coverage-review',
              triggeredBy: 'manual',
            }),
            execution(ALERTZERO_RULE_CREATION_WORKFLOW_ID, undefined, {
              id: 'rule-creation',
              triggeredBy: 'manual',
            }),
            execution(ALERTZERO_COVERAGE_WORKER_WORKFLOW_ID, undefined, {
              id: 'coverage-worker',
              triggeredBy: 'manual',
            }),
          ],
          total: 3,
        }) satisfies FailedExecutionPage
    );
    const { service } = createService(search);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('attributes the same child definition to each Worker that started it', async () => {
    const reviewId = ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID;
    const attackDiscoveryParentId = 'parent-attack-discovery';
    const ruleTuningParentId = 'parent-rule-tuning';
    const attackDiscoveryChild = execution(reviewId, undefined, {
      id: 'child-attack-discovery',
      triggeredBy: WORKFLOW_STEP,
      parentId: attackDiscoveryParentId,
    });
    const ruleTuningChild = execution(reviewId, undefined, {
      id: 'child-rule-tuning',
      triggeredBy: WORKFLOW_STEP,
      parentId: ruleTuningParentId,
    });
    const search = jest.fn(
      async ({ page: pageNumber }: { page: number }): Promise<FailedExecutionPage> => {
        if (pageNumber === 1) {
          return {
            results: Array.from({ length: SCAN_FAILURE_PAGE_SIZE }, () => attackDiscoveryChild),
            total: SCAN_FAILURE_PAGE_SIZE + 1,
          };
        }
        return { results: [ruleTuningChild], total: SCAN_FAILURE_PAGE_SIZE + 1 };
      }
    );
    const { service } = createService(
      search,
      new Map([
        [
          attackDiscoveryParentId,
          execution(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID, undefined, {
            id: attackDiscoveryParentId,
            triggeredBy: 'scheduled',
          }),
        ],
        [
          ruleTuningParentId,
          execution(ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID, undefined, {
            id: ruleTuningParentId,
            triggeredBy: 'scheduled',
          }),
        ],
      ])
    );

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [
        {
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          watchId: SYSTEM_SECURITY_WATCH_FLOOR_ID,
          workflowId: reviewId,
          lastFailedAt: FINISHED_AT,
        },
        {
          workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
          watchId: SYSTEM_SECURITY_WATCH_DETECTION_ID,
          workflowId: reviewId,
          lastFailedAt: FINISHED_AT,
        },
      ],
      unknown: false,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('loads a parent execution once when several failures share it', async () => {
    const parentId = 'shared-parent';
    const child = (id: string) =>
      execution(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID, undefined, {
        id,
        triggeredBy: WORKFLOW_STEP,
        parentId,
      });
    const search = jest.fn(async () => ({
      results: [child('child-a'), child('child-b')],
      total: 2,
    }));
    const { executions, service } = createService(
      search,
      new Map([
        [
          parentId,
          execution(ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID, undefined, {
            id: parentId,
            triggeredBy: 'scheduled',
          }),
        ],
      ])
    );

    await service.list(request, 'default');

    expect(executions.getWorkflowExecution).toHaveBeenCalledTimes(1);
  });

  it('marks the window incomplete when failures remain past the page cap', async () => {
    const total = SCAN_FAILURE_PAGE_SIZE * SCAN_FAILURE_MAX_PAGES + 1;
    const search = jest.fn(async () =>
      page(
        Array.from({ length: SCAN_FAILURE_PAGE_SIZE }, () => ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID),
        total
      )
    );
    const { service } = createService(search);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [],
      unknown: true,
      lastFailedAt: FINISHED_AT,
    });
  });

  it('reads the next page while a full page of failures remains', async () => {
    const search = jest.fn(
      async ({ page: pageNumber }: { page: number }): Promise<FailedExecutionPage> => {
        if (pageNumber === 1) {
          return page(
            Array.from(
              { length: SCAN_FAILURE_PAGE_SIZE },
              () => ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID
            ),
            SCAN_FAILURE_PAGE_SIZE * 2
          );
        }
        return page([ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID], SCAN_FAILURE_PAGE_SIZE * 2);
      }
    );
    const { service } = createService(search);

    await service.list(request, 'default');

    expect(search).toHaveBeenCalledTimes(2);
  });

  it('returns an empty body when the query throws', async () => {
    const search = jest.fn(async () => {
      throw new Error('workflows down');
    });
    const { service } = createService(search);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [],
      unknown: false,
      lastFailedAt: null,
    });
  });

  it('logs a warning when the query throws', async () => {
    const search = jest.fn(async () => {
      throw new Error('workflows down');
    });
    const { logger, service } = createService(search);

    await service.list(request, 'default');

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('workflows down'));
  });

  it('returns an empty body when workflows management is unavailable', async () => {
    const logger = loggerMock.create();
    const service = new ScanFailuresService(undefined, logger);

    await expect(service.list(request, 'default')).resolves.toEqual({
      workers: [],
      unknown: false,
      lastFailedAt: null,
    });
  });
});
