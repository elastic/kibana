/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { readLastSweepIndexScope } from './read_last_sweep_index_scope';

const scope = {
  status: 'blocked',
  resolution: 'blocked:empty_universe',
  index_patterns: [],
  missing: ['logs-*'],
  report_matches: [],
  actionable_indices: [],
  window: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T00:00:00.000Z' },
  row_limit: 25,
};

const setup = (execution: unknown) => {
  const management = {
    getWorkflowExecution: jest.fn().mockResolvedValue(execution),
  };
  const params = {
    management: management as never,
    executionId: 'exec-1',
    spaceId: 'default',
    request: httpServerMock.createKibanaRequest(),
    logger: loggingSystemMock.createLogger(),
  };
  return { management, params };
};

describe('readLastSweepIndexScope', () => {
  it('asks for step outputs', async () => {
    const { management, params } = setup({ stepExecutions: [] });
    await readLastSweepIndexScope(params);
    expect(management.getWorkflowExecution).toHaveBeenCalledWith(
      'exec-1',
      'default',
      params.request,
      { includeOutput: true }
    );
  });

  it('returns undefined when the execution does not exist', async () => {
    const { params } = setup(null);
    await expect(readLastSweepIndexScope(params)).resolves.toBeUndefined();
  });

  it('returns the parsed scope and the step finish time', async () => {
    const { params } = setup({
      startedAt: 'a',
      finishedAt: 'b',
      stepExecutions: [
        { stepId: 'check_index_scope', startedAt: 's', finishedAt: 'f', output: scope },
      ],
    });
    await expect(readLastSweepIndexScope(params)).resolves.toEqual({
      checkedAt: 'f',
      executionId: 'exec-1',
      scope: expect.objectContaining({ resolution: 'blocked:empty_universe' }),
    });
  });

  it('falls back to the step start time when it has no finish time', async () => {
    const { params } = setup({
      startedAt: 'a',
      finishedAt: 'b',
      stepExecutions: [{ stepId: 'check_index_scope', startedAt: 's', output: scope }],
    });
    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ checkedAt: 's' });
  });

  it('has no scope when the step has no output', async () => {
    const { params } = setup({
      startedAt: 'a',
      finishedAt: 'b',
      stepExecutions: [{ stepId: 'check_index_scope', startedAt: 's', finishedAt: 'f' }],
    });
    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ scope: undefined });
  });

  it('has no scope when the execution has no gate step', async () => {
    const { params } = setup({ startedAt: 'a', finishedAt: 'b', stepExecutions: [] });
    await expect(readLastSweepIndexScope(params)).resolves.toMatchObject({ scope: undefined });
  });

  it('returns undefined when the read throws', async () => {
    const { management, params } = setup(null);
    management.getWorkflowExecution.mockRejectedValue(new Error('boom'));
    await expect(readLastSweepIndexScope(params)).resolves.toBeUndefined();
  });
});
