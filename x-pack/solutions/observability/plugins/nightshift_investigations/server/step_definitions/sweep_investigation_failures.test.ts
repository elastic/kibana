/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import {
  NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID,
  NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { reportUnsuccessfulInvestigation } from '../lib/report_unsuccessful_investigation';
import { InvestigationNotFoundError } from '../client/errors';
import { FAILURE_SWEEP_BATCH_SIZE } from '../lib/investigation_failure_sweep';
import { sweepInvestigationFailuresStepDefinition } from './sweep_investigation_failures';

jest.mock('../lib/report_unsuccessful_investigation', () => ({
  reportUnsuccessfulInvestigation: jest.fn(),
}));
const report = jest.mocked(reportUnsuccessfulInvestigation);
const setup = () => {
  report.mockReset().mockResolvedValue(undefined);
  const request = httpServerMock.createKibanaRequest();
  const controller = new AbortController();
  const management = {
    getWorkflow: jest.fn().mockResolvedValue({
      id: 'sweep-ops',
      originManagedWorkflowId: NIGHTSHIFT_INVESTIGATION_FAILURE_SWEEP_WORKFLOW_ID,
      createdAt: '2026-10-29T00:00:00.000Z',
    }),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
    getWorkflowExecution: jest.fn(),
    searchExecutionsView: jest.fn().mockResolvedValue({ results: [] }),
  };
  const logger = loggerMock.create();
  const definition = sweepInvestigationFailuresStepDefinition({
    getWorkflowsManagement: () => ({ management } as never),
  } as never);
  const run = (isTestRun = false) =>
    definition.handler({
      input: {},
      abortSignal: controller.signal,
      logger,
      contextManager: {
        getFakeRequest: () => request,
        getContext: () => ({
          workflow: { id: 'sweep-ops', spaceId: 'ops' },
          execution: { id: 'sweep-execution', isTestRun },
          kibanaUrl: 'https://kibana.test',
        }),
      },
    } as never);
  return { management, request, controller, logger, run };
};
const candidate = (id: string) => ({
  id,
  workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
  status: ExecutionStatus.FAILED,
});

describe('nightshift.sweepInvestigationFailures', () => {
  it('queries authorized persisted outcomes since installation, without collapsing follow-ups', async () => {
    const { management, request, run } = setup();
    management.searchExecutionsView.mockResolvedValue({ results: [candidate('source-run')] });
    expect(await run()).toEqual({
      output: { checked: 1, errors: 0, checkpoint: { completed_through: expect.any(String) } },
    });
    expect(management.searchExecutionsView).toHaveBeenCalledWith(
      expect.objectContaining({
        request,
        statuses: [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT],
        finishedAfter: '2026-10-29T00:00:00.000Z',
        includeManagedExecutions: true,
        size: FAILURE_SWEEP_BATCH_SIZE,
        sortField: 'id',
        sortOrder: 'asc',
      }),
      'ops'
    );
    expect(management.searchExecutionsView.mock.calls[0][0]).not.toHaveProperty('collapse');
    expect(report).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        request,
        spaceId: 'ops',
        executionId: 'source-run',
      })
    );
  });

  it('persists a bounded cursor and resumes the same fixed window from the last completed sweep', async () => {
    const { management, run } = setup();
    const checkpoint = {
      completed_through: '2026-10-29T09:00:00.000Z',
      through: '2026-10-29T10:00:00.000Z',
      after_id: 'run-001',
    };
    management.getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'previous-sweep' }] });
    management.getWorkflowExecution.mockResolvedValue({
      context: { output: { checked: 100, errors: 0, checkpoint } },
    });
    management.searchExecutionsView.mockResolvedValue({
      results: Array.from({ length: FAILURE_SWEEP_BATCH_SIZE }, (_, index) =>
        candidate(`run-${index + 2}`)
      ),
    });
    expect(await run()).toEqual({
      output: { checked: 100, errors: 0, checkpoint: { ...checkpoint, after_id: 'run-101' } },
    });
    expect(management.searchExecutionsView).toHaveBeenCalledWith(
      expect.objectContaining({
        finishedAfter: '2026-10-29T08:50:00.000Z',
        finishedBefore: checkpoint.through,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ range: { id: { gt: 'run-001' } } }]),
          }),
        }),
      }),
      'ops'
    );
  });

  it('retries a failed page without advancing past a failure seen in both queries', async () => {
    const { management, run, logger } = setup();
    const checkpoint = { through: '2026-10-29T10:00:00.000Z', after_id: '0' };
    management.getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'previous-sweep' }] });
    management.getWorkflowExecution.mockResolvedValue({
      context: { output: { checked: 100, errors: 0, checkpoint } },
    });
    management.searchExecutionsView.mockResolvedValue({
      results: [candidate('a'), candidate('b')],
    });
    report.mockRejectedValueOnce(new Error('Conversation write denied'));
    const first = await run();
    expect(first).toEqual({
      output: {
        checked: 2,
        errors: 1,
        checkpoint: { ...checkpoint, retry: { execution_id: 'a', attempts: 1 } },
      },
    });
    expect(report).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Conversation write denied'));
    management.getWorkflowExecution.mockResolvedValue({ context: first });
    expect(await run()).toEqual({
      output: { checked: 2, errors: 0, checkpoint: { completed_through: checkpoint.through } },
    });
    expect(report).toHaveBeenCalledTimes(4);
  });

  it('releases a permanently failing candidate after three attempts and reaches the next backlog page', async () => {
    const { management, run, logger } = setup();
    const backlog = Array.from({ length: FAILURE_SWEEP_BATCH_SIZE }, (_, index) =>
      candidate(`run-${String(index).padStart(3, '0')}`)
    );
    management.getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'previous-sweep' }] });
    management.searchExecutionsView.mockImplementation(async ({ sortField }) => ({
      results: sortField === 'id' ? backlog : [],
    }));
    report.mockImplementation(async (_deps, source) => {
      if (source.executionId === 'run-000') throw new Error('Telemetry target removed');
    });

    for (const attempts of [1, 2, 3]) {
      const result = await run();
      expect(result).toEqual({
        output: {
          checked: 100,
          errors: 1,
          checkpoint: {
            through: expect.any(String),
            ...(attempts < 3
              ? { retry: { execution_id: 'run-000', attempts } }
              : { after_id: 'run-099' }),
          },
        },
      });
      management.getWorkflowExecution.mockResolvedValue({ context: result });
    }

    management.searchExecutionsView.mockImplementation(async ({ sortField }) => ({
      results: sortField === 'id' ? [candidate('run-100')] : [],
    }));
    expect(await run()).toEqual({
      output: { checked: 1, errors: 0, checkpoint: { completed_through: expect.any(String) } },
    });
    expect(report.mock.calls.at(-1)?.[1].executionId).toBe('run-100');
    expect(management.searchExecutionsView.mock.calls.at(-2)?.[0].query.bool.filter).toContainEqual(
      {
        range: { id: { gt: 'run-099' } },
      }
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skipping investigation execution run-000 after 3 attempts while blocking the history cursor'
      )
    );
  });

  it('advances completed windows while overlapping late-visible failures instead of all history', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-04T12:00:00.000Z') });
    try {
      const { management, run } = setup();
      const executions = [{ ...candidate('old-run'), finishedAt: '2026-11-04T11:00:00.000Z' }];
      management.searchExecutionsView.mockImplementation(
        async ({
          finishedAfter,
          finishedBefore,
        }: {
          finishedAfter: string;
          finishedBefore: string;
        }) => ({
          results: executions.filter(
            (execution) =>
              execution.finishedAt >= finishedAfter && execution.finishedAt <= finishedBefore
          ),
        })
      );
      const first = await run();
      expect(first).toEqual({
        output: {
          checked: 1,
          errors: 0,
          checkpoint: { completed_through: '2026-11-04T12:00:00.000Z' },
        },
      });
      management.getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'previous-sweep' }] });
      management.getWorkflowExecution.mockResolvedValue({ context: first });
      executions.push(
        { ...candidate('late-visible-run'), finishedAt: '2026-11-04T11:59:00.000Z' },
        { ...candidate('new-run'), finishedAt: '2026-11-04T12:03:00.000Z' }
      );
      jest.setSystemTime(new Date('2026-11-04T12:05:00.000Z'));

      expect(await run()).toEqual({
        output: {
          checked: 2,
          errors: 0,
          checkpoint: { completed_through: '2026-11-04T12:05:00.000Z' },
        },
      });
      expect(report.mock.calls.map(([, source]) => source.executionId)).toEqual([
        'old-run',
        'late-visible-run',
        'new-run',
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('advances past investigations that no longer exist without blocking later failures', async () => {
    const { management, run } = setup();
    management.searchExecutionsView.mockResolvedValue({
      results: [candidate('deleted-run'), candidate('reportable-run')],
    });
    report.mockRejectedValueOnce(new InvestigationNotFoundError('deleted-investigation'));

    expect(await run()).toEqual({
      output: { checked: 2, errors: 0, checkpoint: { completed_through: expect.any(String) } },
    });
    expect(report.mock.calls.map(([, source]) => source.executionId)).toEqual([
      'deleted-run',
      'reportable-run',
    ]);
  });

  it('releases a pending retry when its execution is no longer in the history window', async () => {
    const { management, run } = setup();
    management.getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'previous-sweep' }] });
    management.getWorkflowExecution.mockResolvedValue({
      context: {
        output: {
          checked: 1,
          errors: 1,
          checkpoint: {
            through: '2026-10-29T10:00:00.000Z',
            retry: { execution_id: 'expired-run', attempts: 1 },
          },
        },
      },
    });

    expect(await run()).toEqual({
      output: {
        checked: 0,
        errors: 0,
        checkpoint: { completed_through: '2026-10-29T10:00:00.000Z' },
      },
    });
  });

  it('ignores foreign workflows and retains the cursor when interrupted', async () => {
    const { management, run, controller } = setup();
    management.searchExecutionsView.mockResolvedValue({
      results: [candidate('a'), candidate('b')],
    });
    report.mockImplementationOnce(async () => {
      controller.abort();
    });
    expect(await run()).toEqual({
      output: { checked: 1, errors: 0, checkpoint: { through: expect.any(String), after_id: 'a' } },
    });
    expect(report).toHaveBeenCalledTimes(1);
  });

  it('prioritizes fresh failures without losing its retained-history cursor', async () => {
    const { management, run } = setup();
    const backlog = Array.from({ length: FAILURE_SWEEP_BATCH_SIZE }, (_, index) =>
      candidate(`old-${index}`)
    );
    management.searchExecutionsView
      .mockResolvedValueOnce({ results: backlog })
      .mockResolvedValueOnce({ results: [candidate('fresh')] });
    const result = await run();
    expect(result).toEqual({
      output: {
        checked: 101,
        errors: 0,
        checkpoint: { through: expect.any(String), after_id: 'old-99' },
      },
    });
    expect(report.mock.calls[0][1].executionId).toBe('fresh');
    expect(management.searchExecutionsView.mock.calls[1][0]).toMatchObject({
      sortField: 'finishedAt',
      sortOrder: 'desc',
    });
  });

  it('keeps the history cursor when reporting a recent failure exhausts the sweep budget', async () => {
    const { management, run, controller } = setup();
    const checkpoint = {
      through: '2026-10-29T10:00:00.000Z',
      after_id: 'previous-history-run',
      retry: { execution_id: 'unprocessed-history-run', attempts: 2 },
    };
    management.getWorkflowExecutions.mockResolvedValue({ results: [{ id: 'previous-sweep' }] });
    management.getWorkflowExecution.mockResolvedValue({
      context: { output: { checked: 100, errors: 0, checkpoint } },
    });
    management.searchExecutionsView
      .mockResolvedValueOnce({ results: [candidate('unprocessed-history-run')] })
      .mockResolvedValueOnce({ results: [candidate('recent-run')] });
    report.mockImplementationOnce(async () => {
      controller.abort();
    });

    expect(await run()).toEqual({ output: { checked: 1, errors: 0, checkpoint } });
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][1].executionId).toBe('recent-run');
  });

  it('overlaps recent-failure windows across five-minute scheduled runs', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-02T12:00:00.000Z') });
    try {
      const { management, run } = setup();
      management.searchExecutionsView.mockResolvedValue({
        results: Array.from({ length: FAILURE_SWEEP_BATCH_SIZE }, (_, index) =>
          candidate(`run-${index}`)
        ),
      });
      await run();
      expect(management.searchExecutionsView.mock.calls[1][0]).toMatchObject({
        finishedAfter: '2026-11-02T11:50:00.000Z',
        finishedBefore: '2026-11-02T12:00:00.000Z',
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not report production investigations from a test execution of the sweep', async () => {
    const { management, run } = setup();
    expect(await run(true)).toEqual({ output: { checked: 0, errors: 0, checkpoint: {} } });
    expect(management.getWorkflow).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it('rejects execution from an unmanaged workflow', async () => {
    const { management, run } = setup();
    management.getWorkflow.mockResolvedValue({ originManagedWorkflowId: 'another-workflow' });
    await expect(run()).rejects.toThrow('managed sweep workflow');
    expect(management.searchExecutionsView).not.toHaveBeenCalled();
  });
});
