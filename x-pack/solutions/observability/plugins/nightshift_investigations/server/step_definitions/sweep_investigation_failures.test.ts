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
import {
  FAILURE_SWEEP_BATCH_SIZE,
  sweepInvestigationFailuresStepDefinition,
} from './sweep_investigation_failures';

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
    expect(await run()).toEqual({ output: { checked: 1, errors: 0, checkpoint: {} } });
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
    const checkpoint = { through: '2026-10-29T10:00:00.000Z', after_id: 'run-001' };
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

  it('finishes a pass so the next pass revisits late persistence and reporting failures', async () => {
    const { management, run, logger } = setup();
    management.searchExecutionsView.mockResolvedValue({
      results: [candidate('a'), candidate('b')],
    });
    report.mockRejectedValueOnce(new Error('Conversation write denied'));
    expect(await run()).toEqual({ output: { checked: 2, errors: 1, checkpoint: {} } });
    expect(report).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Conversation write denied'));
    await run();
    expect(report).toHaveBeenCalledTimes(4);
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
